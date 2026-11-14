import { addCard, deleteCard, MAX_DETAILS, moveCard, renameColumn, updateCard, type Board } from "./board";

/** A change to the board. The same operations run in the browser (instant feedback) and on the server (the real write). */
export type Op =
  | { type: "addCard"; columnId: string; title: string; details?: string; tags?: string[] }
  | { type: "updateCard"; id: string; title?: string; details?: string; tags?: string[] }
  | { type: "deleteCard"; id: string }
  | { type: "moveCard"; id: string; toColumnId: string; toIndex?: number }
  | { type: "renameColumn"; columnId: string; title: string };

/** `makeId` creates the id of a new card: a temporary one in the browser, a file name on the server. */
export function applyOp(board: Board, op: Op, makeId: (title: string) => string): Board {
  switch (op.type) {
    case "addCard":
      return addCard(board, op.columnId, op, makeId(op.title));
    case "updateCard":
      return updateCard(board, op.id, op);
    case "deleteCard":
      return deleteCard(board, op.id);
    case "moveCard":
      return moveCard(board, op.id, op.toColumnId, op.toIndex);
    case "renameColumn":
      return renameColumn(board, op.columnId, op.title);
  }
}

const isString = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const isOptString = (v: unknown, max: number) => v === undefined || isString(v, max);
const isId = (v: unknown): v is string => isString(v, 200) && v.length > 0;
const isTags = (v: unknown) => v === undefined || (Array.isArray(v) && v.length <= 50 && v.every((t) => isString(t, 100)));

/** Validates untrusted JSON from the API. Returns null when it is not a well-formed operation. */
export function parseOp(value: unknown): Op | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case "addCard":
      return isId(v.columnId) && isString(v.title, 500) && isOptString(v.details, MAX_DETAILS) && isTags(v.tags)
        ? { type: "addCard", columnId: v.columnId, title: v.title, details: v.details as string | undefined, tags: v.tags as string[] | undefined }
        : null;
    case "updateCard":
      return isId(v.id) && isOptString(v.title, 500) && isOptString(v.details, MAX_DETAILS) && isTags(v.tags)
        ? { type: "updateCard", id: v.id, title: v.title as string | undefined, details: v.details as string | undefined, tags: v.tags as string[] | undefined }
        : null;
    case "deleteCard":
      return isId(v.id) ? { type: "deleteCard", id: v.id } : null;
    case "moveCard":
      return isId(v.id) && isId(v.toColumnId) && (v.toIndex === undefined || (Number.isInteger(v.toIndex) && (v.toIndex as number) >= 0 && (v.toIndex as number) < 10_000))
        ? { type: "moveCard", id: v.id, toColumnId: v.toColumnId, toIndex: v.toIndex as number | undefined }
        : null;
    case "renameColumn":
      return isId(v.columnId) && isString(v.title, 500) ? { type: "renameColumn", columnId: v.columnId, title: v.title } : null;
    default:
      return null;
  }
}
