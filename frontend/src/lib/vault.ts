import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Board } from "./board";
import { isSafeId, parseKanban, parseTask, serializeKanban, serializeTask, type ParsedKanban } from "./markdown";
import { slugify } from "./text";

const KANBAN = "Kanban.md";
const TASKS = "Tasks";
const ARCHIVE = "_archive";
const DEFAULT_COLUMNS = ["Backlog", "Next", "In progress", "Review", "Done"];

export type VaultLocation = { dir: string; sampleDir: string; demo: boolean };

/**
 * Where the board lives. `VAULT_PATH` selects the owner's real vault.
 * Without it the app works on a throw-away copy of `sample-vault/`, so the tracked demo files are never changed.
 */
export function resolveVault(env: Record<string, string | undefined> = process.env, cwd = process.cwd()): VaultLocation {
  const sampleDir = path.resolve(cwd, "../sample-vault");
  const configured = env.VAULT_PATH?.trim();
  if (configured) return { dir: path.resolve(cwd, configured), sampleDir, demo: false };
  return { dir: path.resolve(cwd, "../.demo-vault"), sampleDir, demo: true };
}

const exists = (p: string) => fs.access(p).then(() => true, () => false);
const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function atomicWrite(file: string, content: string): Promise<void> {
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch {
    // Another program may hold the file open on Windows: fall back to a direct write.
    await fs.writeFile(file, content, "utf8");
    await fs.rm(tmp, { force: true });
  }
}

const emptyBoard = (): Board => ({
  columns: DEFAULT_COLUMNS.map((title, i) => ({ id: `col-${i}`, title, cardIds: [] })),
  cards: {},
});

export async function ensureVault(v: VaultLocation): Promise<void> {
  const kanban = path.join(v.dir, KANBAN);
  if (!(await exists(kanban))) {
    if (await exists(v.dir)) {
      const foreign = (await fs.readdir(v.dir)).filter((n) => !n.startsWith(".") && n !== TASKS);
      if (foreign.length > 0) throw new Error("The vault folder has files but no Kanban.md. Check VAULT_PATH.");
    }
    await fs.mkdir(v.dir, { recursive: true });
    if (v.demo && (await exists(v.sampleDir))) await fs.cp(v.sampleDir, v.dir, { recursive: true });
    else await atomicWrite(kanban, serializeKanban(emptyBoard(), null));
  }
  await fs.mkdir(path.join(v.dir, TASKS), { recursive: true });
}

function taskPath(v: VaultLocation, id: string): string {
  if (!isSafeId(id)) throw new Error("Unsafe card id");
  const dir = path.resolve(v.dir, TASKS);
  const file = path.resolve(dir, `${id}.md`);
  if (path.dirname(file) !== dir) throw new Error("Unsafe card id");
  return file;
}

async function listTaskIds(v: VaultLocation): Promise<string[]> {
  const entries = await fs.readdir(path.join(v.dir, TASKS), { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name.slice(0, -3));
}

function allocateId(title: string, taken: Set<string>): string {
  let max = 0;
  for (const id of taken) {
    const m = /^T(\d+)-/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  let n = max + 1;
  let id = `T${String(n).padStart(3, "0")}-${slugify(title)}`;
  while (taken.has(id)) id = `T${String(++n).padStart(3, "0")}-${slugify(title)}`;
  return id;
}

async function readTaskRaw(v: VaultLocation, id: string): Promise<string | null> {
  return fs.readFile(taskPath(v, id), "utf8").catch(() => null);
}

async function writeTaskFile(v: VaultLocation, id: string, title: string, details: string): Promise<void> {
  const raw = await readTaskRaw(v, id);
  const frontmatter = raw === null ? [`created: ${today()}`] : parseTask(raw).frontmatter;
  const content = serializeTask({ frontmatter, title, details });
  if (raw !== content) await atomicWrite(taskPath(v, id), content);
}

/** Removed cards are moved to Tasks/_archive/, never deleted. */
async function archiveTask(v: VaultLocation, id: string): Promise<void> {
  const from = taskPath(v, id);
  if (!(await exists(from))) return;
  const dir = path.join(v.dir, TASKS, ARCHIVE);
  await fs.mkdir(dir, { recursive: true });
  let to = path.join(dir, `${id}.md`);
  if (await exists(to)) to = path.join(dir, `${id}-${Date.now()}.md`);
  await fs.rename(from, to);
}

/**
 * Reads the board from disk. Cards that have no task file yet (for example typed in Obsidian as plain text)
 * get one, so that every card links to its own Markdown file.
 */
export async function loadBoard(v: VaultLocation): Promise<{ board: Board; parsed: ParsedKanban }> {
  const kanbanPath = path.join(v.dir, KANBAN);
  const parsed = parseKanban(await fs.readFile(kanbanPath, "utf8"));
  const taken = new Set(await listTaskIds(v));
  const used = new Set<string>();
  const board: Board = { columns: [], cards: {} };
  let dirty = false;

  for (const [index, column] of parsed.columns.entries()) {
    const cardIds: string[] = [];
    for (const parsedCard of column.cards) {
      if (!parsedCard.taskId || used.has(parsedCard.taskId)) {
        parsedCard.taskId = allocateId(parsedCard.title, taken);
        taken.add(parsedCard.taskId);
        dirty = true;
      }
      const id = parsedCard.taskId;
      used.add(id);

      const raw = await readTaskRaw(v, id);
      if (raw === null) {
        await writeTaskFile(v, id, parsedCard.title, "");
        dirty = true;
      }
      board.cards[id] = { id, title: parsedCard.title, details: raw === null ? "" : parseTask(raw).details, tags: parsedCard.tags };
      cardIds.push(id);
    }
    board.columns.push({ id: `col-${index}`, title: column.title, cardIds });
  }

  if (dirty) await atomicWrite(kanbanPath, serializeKanban(board, parsed));
  return { board, parsed };
}

async function saveBoard(v: VaultLocation, parsed: ParsedKanban, previous: Board, next: Board): Promise<void> {
  for (const id of next.columns.flatMap((c) => c.cardIds)) {
    const card = next.cards[id];
    const old = previous.cards[id];
    if (!old || old.title !== card.title || old.details !== card.details) await writeTaskFile(v, id, card.title, card.details);
  }
  const kanbanPath = path.join(v.dir, KANBAN);
  const out = serializeKanban(next, parsed);
  if ((await fs.readFile(kanbanPath, "utf8")).replace(/\r\n?/g, "\n") !== out) await atomicWrite(kanbanPath, out);
  for (const id of Object.keys(previous.cards)) if (!next.cards[id]) await archiveTask(v, id);
}

/** A short fingerprint of the vault files. It changes when anything changes, also when Obsidian edits a file. */
export async function boardVersion(v: VaultLocation): Promise<string> {
  const parts: string[] = [];
  const stat = async (file: string, label: string) => {
    const s = await fs.stat(file).catch(() => null);
    parts.push(`${label}:${s ? `${s.mtimeMs}:${s.size}` : "-"}`);
  };
  await stat(path.join(v.dir, KANBAN), KANBAN);
  for (const id of (await listTaskIds(v)).sort()) await stat(path.join(v.dir, TASKS, `${id}.md`), id);
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

// One job at a time per process, so two requests cannot interleave their reads and writes.
const queueHolder = globalThis as { __vaultQueue?: Promise<unknown> };
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = (queueHolder.__vaultQueue ?? Promise.resolve()).then(job, job);
  queueHolder.__vaultQueue = run.catch(() => undefined);
  return run;
}

export function readBoard(v: VaultLocation): Promise<{ board: Board; version: string }> {
  return enqueue(async () => {
    await ensureVault(v);
    const { board } = await loadBoard(v);
    return { board, version: await boardVersion(v) };
  });
}

/** Re-reads the files, applies the change and writes it. `makeId` hands out file names for new cards. */
export function changeBoard(
  v: VaultLocation,
  change: (board: Board, makeId: (title: string) => string) => Board,
): Promise<{ board: Board; version: string }> {
  return enqueue(async () => {
    await ensureVault(v);
    const { board: previous, parsed } = await loadBoard(v);
    const taken = new Set([...Object.keys(previous.cards), ...(await listTaskIds(v))]);
    const next = change(previous, (title) => {
      const id = allocateId(title, taken);
      taken.add(id);
      return id;
    });
    if (next !== previous) await saveBoard(v, parsed, previous, next);
    const { board } = await loadBoard(v);
    return { board, version: await boardVersion(v) };
  });
}
