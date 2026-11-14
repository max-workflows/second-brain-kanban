import { describe, expect, it } from "vitest";
import { sampleBoard } from "@/test/fixtures";
import { addCard, deleteCard, findColumnOfCard, moveCard, renameColumn, updateCard } from "./board";

const ids = (board: ReturnType<typeof sampleBoard>, columnId: string) =>
  board.columns.find((c) => c.id === columnId)!.cardIds;

describe("sample board", () => {
  it("references only existing cards, each in exactly one column", () => {
    const board = sampleBoard();
    const all = board.columns.flatMap((c) => c.cardIds);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(Object.keys(board.cards).sort());
  });
});

describe("addCard", () => {
  it("appends a cleaned card to the column", () => {
    const board = addCard(
      sampleBoard(),
      "col-1",
      { title: "  New [task] | x  ", details: "  Some details ", tags: ["#Urgent", "Docs"] },
      "x1",
    );
    expect(ids(board, "col-1").at(-1)).toBe("x1");
    expect(board.cards.x1).toEqual({ id: "x1", title: "New (task) / x", details: "Some details", tags: ["urgent", "docs"] });
  });

  it("ignores an empty title, an unknown column or a taken id", () => {
    const start = sampleBoard();
    expect(addCard(start, "col-1", { title: "   " }, "x")).toBe(start);
    expect(addCard(start, "nope", { title: "Title" }, "x")).toBe(start);
    expect(addCard(start, "col-1", { title: "Title" }, "c1")).toBe(start);
  });

  it("does not mutate the original board", () => {
    const start = sampleBoard();
    const before = JSON.stringify(start);
    addCard(start, "col-1", { title: "Title" }, "x2");
    expect(JSON.stringify(start)).toBe(before);
  });
});

describe("updateCard", () => {
  it("changes only the given fields", () => {
    const board = updateCard(sampleBoard(), "c1", { details: "New details", tags: ["Ops", "ops", "#plan"] });
    expect(board.cards.c1).toEqual({ id: "c1", title: "Plan the weekly review", details: "New details", tags: ["ops", "plan"] });
  });

  it("keeps the old title when the new one is empty", () => {
    const board = updateCard(sampleBoard(), "c1", { title: "  " });
    expect(board.cards.c1.title).toBe("Plan the weekly review");
  });

  it("ignores an unknown card", () => {
    const start = sampleBoard();
    expect(updateCard(start, "nope", { title: "x" })).toBe(start);
  });
});

describe("deleteCard", () => {
  it("removes the card from its column and from the card list", () => {
    const board = deleteCard(sampleBoard(), "c3");
    expect(ids(board, "col-1")).not.toContain("c3");
    expect(board.cards.c3).toBeUndefined();
  });

  it("ignores an unknown card", () => {
    const start = sampleBoard();
    expect(deleteCard(start, "nope")).toBe(start);
  });
});

describe("renameColumn", () => {
  it("renames with a cleaned title", () => {
    const board = renameColumn(sampleBoard(), "col-3", "  QA  ");
    expect(board.columns.find((c) => c.id === "col-3")!.title).toBe("QA");
  });

  it("ignores an empty title", () => {
    const start = sampleBoard();
    expect(renameColumn(start, "col-3", "  ")).toBe(start);
  });
});

describe("moveCard", () => {
  it("moves a card to the end of another column", () => {
    const board = moveCard(sampleBoard(), "c1", "col-4");
    expect(findColumnOfCard(board, "c1")!.id).toBe("col-4");
    expect(ids(board, "col-4")).toEqual(["c7", "c8", "c1"]);
    expect(ids(board, "col-0")).toEqual(["c2"]);
  });

  it("inserts at a given position in another column", () => {
    const board = moveCard(sampleBoard(), "c1", "col-4", 1);
    expect(ids(board, "col-4")).toEqual(["c7", "c1", "c8"]);
  });

  it("reorders within the same column", () => {
    const board = moveCard(sampleBoard(), "c7", "col-4", 1);
    expect(ids(board, "col-4")).toEqual(["c8", "c7"]);
  });

  it("clamps the index and keeps every card exactly once", () => {
    const board = moveCard(sampleBoard(), "c2", "col-3", 99);
    expect(ids(board, "col-3")).toEqual(["c6", "c2"]);
    expect(board.columns.flatMap((c) => c.cardIds).length).toBe(Object.keys(board.cards).length);
  });

  it("ignores unknown cards or columns", () => {
    const start = sampleBoard();
    expect(moveCard(start, "nope", "col-4")).toBe(start);
    expect(moveCard(start, "c1", "nope")).toBe(start);
  });
});
