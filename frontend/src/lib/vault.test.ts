// @vitest-environment node
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyOp, type Op } from "./ops";
import { boardVersion, changeBoard, ensureVault, loadBoard, readBoard, resolveVault, type VaultLocation } from "./vault";

let root: string;
let vault: VaultLocation;

const read = (...p: string[]) => fs.readFile(path.join(vault.dir, ...p), "utf8");
const write = (rel: string, text: string) => fs.writeFile(path.join(vault.dir, rel), text, "utf8");
const run = (op: Op) => changeBoard(vault, (board, makeId) => applyOp(board, op, makeId));

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanban-test-"));
  vault = { dir: path.join(root, "vault"), sampleDir: path.join(root, "sample"), demo: false };
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("resolveVault", () => {
  it("uses VAULT_PATH when set, relative to the working directory", () => {
    const v = resolveVault({ VAULT_PATH: "../my-vault" }, path.join(root, "frontend"));
    expect(v).toMatchObject({ dir: path.join(root, "my-vault"), demo: false });
  });
  it("falls back to a demo copy outside the tracked sample", () => {
    const v = resolveVault({}, path.join(root, "frontend"));
    expect(v).toMatchObject({ dir: path.join(root, ".demo-vault"), sampleDir: path.join(root, "sample-vault"), demo: true });
  });
});

describe("ensureVault", () => {
  it("creates a board with five empty columns", async () => {
    await ensureVault(vault);
    const { board } = await loadBoard(vault);
    expect(board.columns.map((c) => c.title)).toEqual(["Backlog", "Next", "In progress", "Review", "Done"]);
    expect((await fs.stat(path.join(vault.dir, "Tasks"))).isDirectory()).toBe(true);
  });

  it("seeds a demo vault from the sample", async () => {
    await fs.mkdir(path.join(root, "sample", "Tasks"), { recursive: true });
    await fs.writeFile(path.join(root, "sample", "Kanban.md"), "## Only\n\n- [ ] [[Tasks/T001-x|X]]\n");
    await fs.writeFile(path.join(root, "sample", "Tasks", "T001-x.md"), "# X\n\nDetails\n");
    vault = { ...vault, demo: true };
    const { board } = await readBoard(vault);
    expect(board.cards["T001-x"]).toMatchObject({ title: "X", details: "Details" });
  });

  it("refuses a folder that holds other files and no board", async () => {
    await fs.mkdir(vault.dir, { recursive: true });
    await write("holiday-photos.txt", "not a vault");
    await expect(ensureVault(vault)).rejects.toThrow(/Kanban\.md/);
    await expect(fs.access(path.join(vault.dir, "Kanban.md"))).rejects.toBeTruthy();
  });

  it("accepts an Obsidian folder that is otherwise empty", async () => {
    await fs.mkdir(path.join(vault.dir, ".obsidian"), { recursive: true });
    await expect(ensureVault(vault)).resolves.toBeUndefined();
  });
});

describe("changing the board", () => {
  beforeEach(() => ensureVault(vault));

  it("adds a card: task file, board line, tags", async () => {
    const { board } = await run({ type: "addCard", columnId: "col-1", title: "Write release notes", details: "Short.", tags: ["Docs", "#ops"] });
    const id = board.columns[1].cardIds[0];
    expect(id).toBe("T001-write-release-notes");
    expect(await read("Tasks", `${id}.md`)).toMatch(/^---\ncreated: \d{4}-\d{2}-\d{2}\n---\n\n# Write release notes\n\nShort\.\n$/);
    expect(await read("Kanban.md")).toContain("- [ ] [[Tasks/T001-write-release-notes|Write release notes]] #docs #ops");
  });

  it("numbers new cards after the highest existing number", async () => {
    await write("Tasks/T041-old.md", "# Old\n");
    const { board } = await run({ type: "addCard", columnId: "col-0", title: "Next one" });
    expect(board.columns[0].cardIds[0]).toBe("T042-next-one");
  });

  it("edits a card and keeps extra front matter written by the owner", async () => {
    const { board } = await run({ type: "addCard", columnId: "col-0", title: "Plan" });
    const id = board.columns[0].cardIds[0];
    await write(`Tasks/${id}.md`, "---\ncreated: 2026-01-01\ndue: friday\n---\n\n# Plan\n\nold\n");
    await run({ type: "updateCard", id, title: "Plan better", details: "new details", tags: ["x"] });
    expect(await read("Tasks", `${id}.md`)).toBe("---\ncreated: 2026-01-01\ndue: friday\n---\n\n# Plan better\n\nnew details\n");
    expect(await read("Kanban.md")).toContain(`[[Tasks/${id}|Plan better]] #x`);
  });

  it("moves a card between columns", async () => {
    const { board } = await run({ type: "addCard", columnId: "col-0", title: "Move me" });
    const id = board.columns[0].cardIds[0];
    const after = await run({ type: "moveCard", id, toColumnId: "col-4" });
    expect(after.board.columns[0].cardIds).toEqual([]);
    expect(after.board.columns[4].cardIds).toEqual([id]);
    const text = await read("Kanban.md");
    expect(text.indexOf(id)).toBeGreaterThan(text.indexOf("## Done"));
  });

  it("archives the task file of a deleted card instead of deleting it", async () => {
    const { board } = await run({ type: "addCard", columnId: "col-0", title: "Short lived", details: "keep me" });
    const id = board.columns[0].cardIds[0];
    await run({ type: "deleteCard", id });
    await expect(fs.access(path.join(vault.dir, "Tasks", `${id}.md`))).rejects.toBeTruthy();
    expect(await read("Tasks", "_archive", `${id}.md`)).toContain("keep me");
    expect(await read("Kanban.md")).not.toContain(id);
  });

  it("renames a column in the file", async () => {
    await run({ type: "renameColumn", columnId: "col-3", title: "QA" });
    expect(await read("Kanban.md")).toContain("## QA");
  });

  it("does not touch the files for an operation that changes nothing", async () => {
    const before = await boardVersion(vault);
    await run({ type: "deleteCard", id: "does-not-exist" });
    expect(await boardVersion(vault)).toBe(before);
  });

  it("keeps the notes and settings that the Obsidian plugin wrote", async () => {
    await write(
      "Kanban.md",
      "---\n\nkanban-plugin: board\n\n---\n\n## Todo\n\n\n\n## Done\n\n**Complete**\n\n\n\n%% kanban:settings\n```\n{\"kanban-plugin\":\"board\",\"x\":1}\n```\n%%\n",
    );
    await run({ type: "addCard", columnId: "col-0", title: "Hello" });
    const text = await read("Kanban.md");
    expect(text).toContain("**Complete**");
    expect(text).toContain('{"kanban-plugin":"board","x":1}');
  });

  it("handles many simultaneous requests without losing cards", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => run({ type: "addCard", columnId: "col-0", title: `Card ${i}` })));
    const { board } = await loadBoard(vault);
    const ids = board.columns[0].cardIds;
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    expect((await fs.readdir(path.join(vault.dir, "Tasks"))).filter((n) => n.endsWith(".md"))).toHaveLength(12);
  });
});

describe("loading files edited outside the app", () => {
  beforeEach(() => ensureVault(vault));

  it("gives plain cards a task file and a link", async () => {
    await write("Kanban.md", "---\n\nkanban-plugin: board\n\n---\n\n## Backlog\n\n- [ ] Buy milk #home\n\n\n%% kanban:settings\n```\n{}\n```\n%%\n");
    const { board } = await loadBoard(vault);
    expect(board.cards["T001-buy-milk"]).toMatchObject({ title: "Buy milk", tags: ["home"] });
    expect(await read("Tasks", "T001-buy-milk.md")).toContain("# Buy milk");
    expect(await read("Kanban.md")).toContain("- [ ] [[Tasks/T001-buy-milk|Buy milk]] #home");
  });

  it("creates a missing task file for a card that links to one", async () => {
    await write("Kanban.md", "## Backlog\n\n- [ ] [[Tasks/T007-ghost|Ghost]]\n");
    await loadBoard(vault);
    expect(await read("Tasks", "T007-ghost.md")).toContain("# Ghost");
  });

  it("reads details written in Obsidian and notices the change in the version", async () => {
    const { board } = await run({ type: "addCard", columnId: "col-0", title: "Notes" });
    const id = board.columns[0].cardIds[0];
    const before = await boardVersion(vault);
    await new Promise((r) => setTimeout(r, 15));
    await write(`Tasks/${id}.md`, "# Notes\n\nWritten in Obsidian\n\n- a\n- b\n");
    expect(await boardVersion(vault)).not.toBe(before);
    expect((await loadBoard(vault)).board.cards[id].details).toBe("Written in Obsidian\n\n- a\n- b");
  });

  it("gives a card that is listed twice its own file", async () => {
    await write("Kanban.md", "## A\n\n- [ ] [[Tasks/T001-x|X]]\n- [ ] [[Tasks/T001-x|X again]]\n");
    const { board } = await loadBoard(vault);
    expect(board.columns[0].cardIds).toHaveLength(2);
    expect(new Set(board.columns[0].cardIds).size).toBe(2);
  });
});
