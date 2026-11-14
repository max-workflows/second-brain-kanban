import { describe, expect, it } from "vitest";
import type { Board } from "./board";
import { isSafeId, parseKanban, parseTask, serializeKanban, serializeTask } from "./markdown";

const CANONICAL = `---

kanban-plugin: board

---

## Backlog

- [ ] [[Tasks/T001-plan|Plan the week]] #planning #docs
  note kept under the card


## Next



## Done

**Complete**

- [x] [[Tasks/T002-ship|Ship it]]


%% kanban:settings
\`\`\`
{"kanban-plugin":"board","list-collapse":[false,false,false]}
\`\`\`
%%
`;

/** Turns a parsed file into a board the way the vault layer does. */
function toBoard(text: string): Board {
  const parsed = parseKanban(text);
  const board: Board = { columns: [], cards: {} };
  parsed.columns.forEach((col, i) => {
    const cardIds: string[] = [];
    for (const c of col.cards) {
      const id = c.taskId!;
      board.cards[id] = { id, title: c.title, details: "", tags: c.tags };
      cardIds.push(id);
    }
    board.columns.push({ id: `col-${i}`, title: col.title, cardIds });
  });
  return board;
}

describe("parseKanban", () => {
  it("reads columns, cards, tags and the linked task", () => {
    const parsed = parseKanban(CANONICAL);
    expect(parsed.columns.map((c) => c.title)).toEqual(["Backlog", "Next", "Done"]);
    expect(parsed.columns[0].cards[0]).toEqual({
      taskId: "T001-plan",
      title: "Plan the week",
      tags: ["planning", "docs"],
      checked: false,
      extra: ["  note kept under the card"],
    });
    expect(parsed.columns[2].preface).toEqual(["**Complete**"]);
    expect(parsed.columns[2].cards[0].checked).toBe(true);
    expect(parsed.tail[0]).toBe("%% kanban:settings");
  });

  it("treats a plain card as a card without a task", () => {
    const parsed = parseKanban("## Backlog\n\n- [ ] Buy milk #home\n");
    expect(parsed.columns[0].cards[0]).toMatchObject({ taskId: undefined, title: "Buy milk", tags: ["home"] });
  });

  it("uses the visible text of a link to something else", () => {
    const parsed = parseKanban("## A\n\n- [ ] [[Notes/Idea|Great idea]] #x\n");
    expect(parsed.columns[0].cards[0]).toMatchObject({ taskId: undefined, title: "Great idea", tags: ["x"] });
  });

  it("does not treat numbers like #1 as tags", () => {
    const parsed = parseKanban("## A\n\n- [ ] Issue #12 and #bug\n");
    expect(parsed.columns[0].cards[0]).toMatchObject({ title: "Issue #12 and", tags: ["bug"] });
  });

  it("refuses unsafe task ids", () => {
    const parsed = parseKanban("## A\n\n- [ ] [[Tasks/..|Evil]]\n");
    expect(parsed.columns[0].cards[0].taskId).toBeUndefined();
  });

  it("copes with Windows line endings and an empty file", () => {
    expect(parseKanban("## A\r\n\r\n- [ ] [[Tasks/T1-a|A]]\r\n").columns[0].cards).toHaveLength(1);
    expect(parseKanban("")).toEqual({ head: [], columns: [], tail: [] });
  });

  it("keeps an archive section in the tail", () => {
    const parsed = parseKanban("## A\n\n- [ ] [[Tasks/T1-a|A]]\n\n***\n\n## Archive\n\n- [x] old\n");
    expect(parsed.columns).toHaveLength(1);
    expect(parsed.tail).toEqual(["***", "", "## Archive", "", "- [x] old"]);
  });
});

describe("serializeKanban", () => {
  it("writes back exactly what it read (round trip)", () => {
    expect(serializeKanban(toBoard(CANONICAL), parseKanban(CANONICAL))).toBe(CANONICAL);
  });

  it("applies changes and keeps everything else", () => {
    const board = toBoard(CANONICAL);
    board.columns[1].cardIds.push(...board.columns[0].cardIds.splice(0, 1));
    board.columns[0].title = "Ideas";
    board.cards["T001-plan"].tags = ["urgent"];
    const text = serializeKanban(board, parseKanban(CANONICAL));
    expect(text).toContain("## Ideas");
    expect(text).toContain("- [ ] [[Tasks/T001-plan|Plan the week]] #urgent\n  note kept under the card");
    expect(text).toContain("**Complete**");
    expect(text).toContain('{"kanban-plugin":"board","list-collapse":[false,false,false]}');
    expect(text.indexOf("T001-plan")).toBeGreaterThan(text.indexOf("## Next"));
  });

  it("creates a valid default file without a previous version", () => {
    const text = serializeKanban({ columns: [{ id: "col-0", title: "Todo", cardIds: [] }], cards: {} }, null);
    expect(text.startsWith("---\n\nkanban-plugin: board\n\n---\n\n## Todo\n")).toBe(true);
    expect(text).toContain("%% kanban:settings");
    expect(parseKanban(text).columns.map((c) => c.title)).toEqual(["Todo"]);
  });
});

describe("task files", () => {
  it("parses front matter, title and details", () => {
    const task = parseTask("---\ncreated: 2026-11-14\ndue: friday\n---\n\n# Plan\n\nLine one\n\nLine two\n");
    expect(task).toEqual({ frontmatter: ["created: 2026-11-14", "due: friday"], title: "Plan", details: "Line one\n\nLine two" });
  });

  it("treats a file without a heading as all details", () => {
    expect(parseTask("Just text\n")).toEqual({ frontmatter: [], title: undefined, details: "Just text" });
  });

  it("round-trips and keeps unknown front matter keys", () => {
    const text = "---\ncreated: 2026-11-14\ndue: friday\n---\n\n# Plan\n\nDetails here\n";
    const task = parseTask(text);
    expect(serializeTask({ frontmatter: task.frontmatter, title: task.title!, details: task.details })).toBe(text);
  });

  it("writes only the heading when there are no details", () => {
    expect(serializeTask({ frontmatter: [], title: "Empty", details: "" })).toBe("# Empty\n");
  });
});

describe("isSafeId", () => {
  it.each(["T001-plan", "T002-зібрати-вакансії", "note 1"])("accepts %s", (id) => expect(isSafeId(id)).toBe(true));
  it.each(["..", "../x", "a/b", "a\\b", "", " lead", ".hidden", "a..b"])("rejects %j", (id) => expect(isSafeId(id)).toBe(false));
});
