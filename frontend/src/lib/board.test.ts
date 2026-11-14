import { describe, expect, it } from "vitest";
import { addCard, createInitialBoard, deleteCard, findColumnOfCard, moveCard, renameColumn } from "./board";

const ids = (board: ReturnType<typeof createInitialBoard>, columnId: string) =>
  board.columns.find((c) => c.id === columnId)!.cardIds;

describe("initial board", () => {
  it("has five columns with dummy cards", () => {
    const board = createInitialBoard();
    expect(board.columns.map((c) => c.title)).toEqual(["Backlog", "Next", "In progress", "Review", "Done"]);
    expect(Object.keys(board.cards).length).toBeGreaterThan(0);
  });

  it("references only existing cards, each in exactly one column", () => {
    const board = createInitialBoard();
    const all = board.columns.flatMap((c) => c.cardIds);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(Object.keys(board.cards).sort());
  });
});

describe("addCard", () => {
  it("appends a trimmed card to the column", () => {
    const board = addCard(createInitialBoard(), "next", "  New task  ", "  Some details ", "x1");
    expect(ids(board, "next").at(-1)).toBe("x1");
    expect(board.cards.x1).toEqual({ id: "x1", title: "New task", details: "Some details" });
  });

  it("ignores an empty title or an unknown column", () => {
    const start = createInitialBoard();
    expect(addCard(start, "next", "   ")).toBe(start);
    expect(addCard(start, "nope", "Title")).toBe(start);
  });

  it("does not mutate the original board", () => {
    const start = createInitialBoard();
    const before = JSON.stringify(start);
    addCard(start, "next", "Title", "", "x2");
    expect(JSON.stringify(start)).toBe(before);
  });
});

describe("deleteCard", () => {
  it("removes the card from its column and from the card list", () => {
    const board = deleteCard(createInitialBoard(), "c3");
    expect(ids(board, "next")).not.toContain("c3");
    expect(board.cards.c3).toBeUndefined();
  });

  it("ignores an unknown card", () => {
    const start = createInitialBoard();
    expect(deleteCard(start, "nope")).toBe(start);
  });
});

describe("renameColumn", () => {
  it("renames with a trimmed title", () => {
    const board = renameColumn(createInitialBoard(), "review", "  QA  ");
    expect(board.columns.find((c) => c.id === "review")!.title).toBe("QA");
  });

  it("ignores an empty title", () => {
    const start = createInitialBoard();
    expect(renameColumn(start, "review", "  ")).toBe(start);
  });
});

describe("moveCard", () => {
  it("moves a card to the end of another column", () => {
    const board = moveCard(createInitialBoard(), "c1", "done");
    expect(findColumnOfCard(board, "c1")!.id).toBe("done");
    expect(ids(board, "done")).toEqual(["c7", "c8", "c1"]);
    expect(ids(board, "backlog")).toEqual(["c2"]);
  });

  it("inserts at a given position in another column", () => {
    const board = moveCard(createInitialBoard(), "c1", "done", 1);
    expect(ids(board, "done")).toEqual(["c7", "c1", "c8"]);
  });

  it("reorders within the same column", () => {
    const board = moveCard(createInitialBoard(), "c7", "done", 1);
    expect(ids(board, "done")).toEqual(["c8", "c7"]);
  });

  it("clamps the index and keeps every card exactly once", () => {
    const board = moveCard(createInitialBoard(), "c2", "review", 99);
    expect(ids(board, "review")).toEqual(["c6", "c2"]);
    const all = board.columns.flatMap((c) => c.cardIds);
    expect(all.length).toBe(Object.keys(board.cards).length);
  });

  it("ignores unknown cards or columns", () => {
    const start = createInitialBoard();
    expect(moveCard(start, "nope", "done")).toBe(start);
    expect(moveCard(start, "c1", "nope")).toBe(start);
  });
});
