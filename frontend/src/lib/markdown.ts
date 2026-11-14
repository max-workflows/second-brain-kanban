import type { Board } from "./board";

/**
 * Reading and writing the vault files. Pure text in, text out.
 * Kanban.md follows the Obsidian Kanban plugin format; see docs/VAULT-FORMAT.md.
 */

export type ParsedCard = {
  /** File name (without .md) of the linked task in Tasks/. Missing for plain cards. */
  taskId?: string;
  title: string;
  tags: string[];
  checked: boolean;
  /** Indented lines under the card, kept as they are. */
  extra: string[];
};
export type ParsedColumn = { title: string; preface: string[]; cards: ParsedCard[] };
export type ParsedKanban = { head: string[]; columns: ParsedColumn[]; tail: string[] };

const CARD_LINE = /^- \[([ xX])\] ?(.*)$/;
const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/;
const TASK_TARGET = /^Tasks\/([^/\\]+?)(?:\.md)?$/;
const TAG = /(^|\s)#([\p{L}\p{N}_/-]+)/gu;

const DEFAULT_HEAD = ["---", "", "kanban-plugin: board", "", "---"];
const DEFAULT_TAIL = ["%% kanban:settings", "```", '{"kanban-plugin":"board"}', "```", "%%"];

/** Ids become file names, so only plain names are accepted. */
export function isSafeId(id: string): boolean {
  return /^[\p{L}\p{N}][\p{L}\p{N}._ -]*$/u.test(id) && !id.includes("..") && id.length <= 120;
}

const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, "\n");
const trimEndBlank = (lines: string[]) => {
  const out = [...lines];
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
};

function parseCardText(text: string): Omit<ParsedCard, "checked" | "extra"> {
  let rest = text;
  let taskId: string | undefined;
  let alias: string | undefined;

  const link = WIKILINK.exec(text);
  if (link) {
    const target = link[1].trim();
    const taskTarget = TASK_TARGET.exec(target);
    if (taskTarget && isSafeId(taskTarget[1])) {
      taskId = taskTarget[1];
      alias = link[2]?.trim() || undefined;
      rest = text.replace(link[0], "");
    } else {
      // A link to something else: keep its visible text as the title.
      rest = text.replace(link[0], link[2]?.trim() || target);
    }
  }

  const tags: string[] = [];
  for (const m of rest.matchAll(TAG)) if (/\D/.test(m[2])) tags.push(m[2].toLowerCase());
  const leftover = rest.replace(TAG, (full, space: string, name: string) => (/\D/.test(name) ? space : full)).replace(/\s+/g, " ").trim();

  return { taskId, title: alias || leftover || taskId || "Untitled", tags: [...new Set(tags)] };
}

export function parseKanban(markdown: string): ParsedKanban {
  const lines = normalizeNewlines(markdown).split("\n");
  const firstColumn = lines.findIndex((l) => l.startsWith("## "));
  if (firstColumn === -1) return { head: trimEndBlank(lines), columns: [], tail: [] };

  let tailStart = lines.length;
  let inFence = false;
  for (let i = firstColumn; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) inFence = !inFence;
    if (!inFence && (line === "***" || line.startsWith("%% kanban:settings"))) {
      tailStart = i;
      break;
    }
  }

  const columns: ParsedColumn[] = [];
  let column: ParsedColumn | null = null;
  let last: ParsedCard | null = null;
  for (const line of lines.slice(firstColumn, tailStart)) {
    if (line.startsWith("## ")) {
      column = { title: line.slice(3).trim(), preface: [], cards: [] };
      columns.push(column);
      last = null;
      continue;
    }
    const m = CARD_LINE.exec(line);
    if (m && column) {
      last = { ...parseCardText(m[2]), checked: m[1] !== " ", extra: [] };
      column.cards.push(last);
      continue;
    }
    if (!column || line.trim() === "") continue;
    if (last) last.extra.push(line);
    else column.preface.push(line);
  }

  return { head: trimEndBlank(lines.slice(0, firstColumn)), columns, tail: trimEndBlank(lines.slice(tailStart)) };
}

/** Writes the board back, keeping what is not ours: front matter, column notes, card sub-lines, archive and settings. */
export function serializeKanban(board: Board, previous: ParsedKanban | null): string {
  const oldCards = new Map<string, ParsedCard>();
  for (const col of previous?.columns ?? []) for (const c of col.cards) if (c.taskId) oldCards.set(c.taskId, c);

  const out: string[] = [...(previous?.head.length ? previous.head : DEFAULT_HEAD), ""];
  board.columns.forEach((column, index) => {
    out.push(`## ${column.title}`, "");
    const preface = previous?.columns[index]?.preface ?? [];
    if (preface.length) out.push(...preface, "");
    for (const id of column.cardIds) {
      const card = board.cards[id];
      const old = oldCards.get(id);
      const tags = card.tags.map((t) => ` #${t}`).join("");
      out.push(`- [${old?.checked ? "x" : " "}] [[Tasks/${id}|${card.title}]]${tags}`, ...(old?.extra ?? []));
    }
    out.push("", "");
  });
  out.push(...(previous?.tail.length ? previous.tail : DEFAULT_TAIL));
  return out.join("\n") + "\n";
}

export type ParsedTask = { frontmatter: string[]; title?: string; details: string };

/** Task file: optional front matter, then `# Title`, then the details (everything else). */
export function parseTask(markdown: string): ParsedTask {
  const lines = normalizeNewlines(markdown).split("\n");
  let i = 0;
  let frontmatter: string[] = [];
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) {
      frontmatter = lines.slice(1, end);
      i = end + 1;
    }
  }
  while (i < lines.length && lines[i].trim() === "") i++;
  let title: string | undefined;
  if (i < lines.length && lines[i].startsWith("# ")) {
    title = lines[i].slice(2).trim();
    i++;
    while (i < lines.length && lines[i].trim() === "") i++;
  }
  return { frontmatter, title, details: lines.slice(i).join("\n").replace(/\s+$/, "") };
}

export function serializeTask(task: { frontmatter: string[]; title: string; details: string }): string {
  const out: string[] = [];
  if (task.frontmatter.length) out.push("---", ...task.frontmatter, "---", "");
  out.push(`# ${task.title}`);
  if (task.details) out.push("", task.details);
  return out.join("\n") + "\n";
}
