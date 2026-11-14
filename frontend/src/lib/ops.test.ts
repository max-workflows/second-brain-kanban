import { describe, expect, it } from "vitest";
import { sampleBoard } from "@/test/fixtures";
import { applyOp, parseOp } from "./ops";

describe("applyOp", () => {
  it("adds a card using the given id maker", () => {
    const board = applyOp(sampleBoard(), { type: "addCard", columnId: "col-0", title: "Hello" }, (t) => `id-${t}`);
    expect(board.cards["id-Hello"].title).toBe("Hello");
  });

  it("runs the other operations", () => {
    let board = sampleBoard();
    const make = () => "unused";
    board = applyOp(board, { type: "updateCard", id: "c1", title: "Renamed" }, make);
    board = applyOp(board, { type: "moveCard", id: "c1", toColumnId: "col-4" }, make);
    board = applyOp(board, { type: "renameColumn", columnId: "col-4", title: "Finished" }, make);
    board = applyOp(board, { type: "deleteCard", id: "c2" }, make);
    expect(board.cards.c1.title).toBe("Renamed");
    expect(board.columns[4].cardIds.at(-1)).toBe("c1");
    expect(board.columns[4].title).toBe("Finished");
    expect(board.cards.c2).toBeUndefined();
  });
});

describe("parseOp", () => {
  it("accepts well-formed operations", () => {
    expect(parseOp({ type: "addCard", columnId: "col-0", title: "T", tags: ["a"] })).toMatchObject({ type: "addCard" });
    expect(parseOp({ type: "moveCard", id: "c1", toColumnId: "col-1", toIndex: 0 })).toMatchObject({ toIndex: 0 });
    expect(parseOp({ type: "deleteCard", id: "c1" })).toEqual({ type: "deleteCard", id: "c1" });
  });

  it.each([
    null,
    "text",
    42,
    {},
    { type: "unknown" },
    { type: "addCard", columnId: "col-0" },
    { type: "addCard", columnId: "col-0", title: 5 },
    { type: "addCard", columnId: "col-0", title: "T", tags: "a" },
    { type: "moveCard", id: "c1", toColumnId: "col-1", toIndex: -1 },
    { type: "moveCard", id: "c1", toColumnId: "col-1", toIndex: 1.5 },
    { type: "deleteCard", id: "" },
    { type: "renameColumn", columnId: "col-0" },
  ])("rejects %j", (value) => {
    expect(parseOp(value)).toBeNull();
  });
});
