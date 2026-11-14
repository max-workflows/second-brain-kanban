// @vitest-environment node
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { serializeKanban } from "./markdown";
import { applyOp } from "./ops";
import { changeBoard, loadBoard, type VaultLocation } from "./vault";

const script = path.resolve(__dirname, "../../../scripts/init-vault.mjs");
let root: string;
let target: string;
let vault: VaultLocation;

const init = () => execFileSync("node", [script, target], { encoding: "utf8" });
const exists = (rel: string) => fs.access(path.join(target, rel)).then(() => true, () => false);

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanban-init-"));
  target = path.join(root, "my-vault");
  vault = { dir: target, sampleDir: path.join(root, "none"), demo: false };
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("scripts/init-vault.mjs", () => {
  it("creates the schema, hooks, lint tool, routines, wiki folders and an empty board", async () => {
    const output = init();
    expect(output).toMatch(/Created \d+ item/);
    for (const rel of [
      "AGENTS.md",
      "CLAUDE.md",
      ".claude/settings.json",
      ".claude/hooks/session_start.py",
      ".claude/hooks/stop_check.py",
      ".claude/tools/lint.py",
      ".claude/routines/inbox.md",
      "raw/articles",
      "wiki/sources",
      "wiki/entities",
      "wiki/concepts",
      "wiki/synthesis",
      "wiki/index.md",
      "wiki/log.md",
      "hotcache.md",
      "Kanban.md",
      "Tasks",
    ]) {
      expect(await exists(rel), rel).toBe(true);
    }
  });

  it("copies none of the demo content", async () => {
    init();
    expect(await exists("raw/articles/2026-11-10-local-first-software-notes.md")).toBe(false);
    expect(await exists("wiki/sources/local-first-software-notes.md")).toBe(false);
    const index = await fs.readFile(path.join(target, "wiki", "index.md"), "utf8");
    expect(index).not.toContain("local-first");
  });

  it("never overwrites what is already there", async () => {
    await fs.mkdir(path.join(target, "wiki"), { recursive: true });
    await fs.writeFile(path.join(target, "AGENTS.md"), "my own rules");
    await fs.writeFile(path.join(target, "wiki", "log.md"), "# Log\n\nmy entries");
    await fs.writeFile(path.join(target, "Kanban.md"), "## Mine\n\n- [ ] [[Tasks/T001-a|A]]\n");
    const output = init();
    expect(await fs.readFile(path.join(target, "AGENTS.md"), "utf8")).toBe("my own rules");
    expect(await fs.readFile(path.join(target, "wiki", "log.md"), "utf8")).toBe("# Log\n\nmy entries");
    expect(await fs.readFile(path.join(target, "Kanban.md"), "utf8")).toContain("## Mine");
    expect(output).toContain("= AGENTS.md (already there)");
  });

  it("can be run again without changing anything", async () => {
    init();
    const before = await fs.readFile(path.join(target, "hotcache.md"), "utf8");
    expect(init()).toMatch(/Created 0 item/);
    expect(await fs.readFile(path.join(target, "hotcache.md"), "utf8")).toBe(before);
  });
});

describe("a vault made by the script works with the board app", () => {
  it("is accepted and holds five empty columns that survive a write round trip", async () => {
    init();
    const { board, parsed } = await loadBoard(vault);
    expect(board.columns.map((c) => c.title)).toEqual(["Backlog", "Next", "In progress", "Review", "Done"]);
    expect(Object.keys(board.cards)).toHaveLength(0);
    expect(serializeKanban(board, parsed)).toBe(await fs.readFile(path.join(target, "Kanban.md"), "utf8"));
  });

  it("takes new cards, and the second-brain files are left alone", async () => {
    init();
    const agents = await fs.readFile(path.join(target, "AGENTS.md"), "utf8");
    await changeBoard(vault, (b, makeId) => applyOp(b, { type: "addCard", columnId: "col-0", title: "First card" }, makeId));
    expect(await fs.readFile(path.join(target, "Tasks", "T001-first-card.md"), "utf8")).toContain("# First card");
    expect(await fs.readFile(path.join(target, "AGENTS.md"), "utf8")).toBe(agents);
  });
});
