import { cleanTitle, normalizeTags } from "./text";

export type Card = { id: string; title: string; details: string; tags: string[] };
export type Column = { id: string; title: string; cardIds: string[] };
export type Board = { columns: Column[]; cards: Record<string, Card> };

export const MAX_DETAILS = 20_000;

export function findColumnOfCard(board: Board, cardId: string): Column | undefined {
  return board.columns.find((col) => col.cardIds.includes(cardId));
}

export function addCard(
  board: Board,
  columnId: string,
  input: { title: string; details?: string; tags?: string[] },
  id: string,
): Board {
  const title = cleanTitle(input.title);
  if (!title || board.cards[id] || !board.columns.some((c) => c.id === columnId)) return board;
  const card: Card = {
    id,
    title,
    details: (input.details ?? "").trim().slice(0, MAX_DETAILS),
    tags: normalizeTags(input.tags ?? []),
  };
  return {
    cards: { ...board.cards, [id]: card },
    columns: board.columns.map((col) =>
      col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col,
    ),
  };
}

export function updateCard(
  board: Board,
  cardId: string,
  patch: { title?: string; details?: string; tags?: string[] },
): Board {
  const card = board.cards[cardId];
  if (!card) return board;
  const title = patch.title === undefined ? card.title : cleanTitle(patch.title) || card.title;
  const details = patch.details === undefined ? card.details : patch.details.trim().slice(0, MAX_DETAILS);
  const tags = patch.tags === undefined ? card.tags : normalizeTags(patch.tags);
  return { ...board, cards: { ...board.cards, [cardId]: { ...card, title, details, tags } } };
}

export function deleteCard(board: Board, cardId: string): Board {
  if (!board.cards[cardId]) return board;
  const cards = Object.fromEntries(Object.entries(board.cards).filter(([id]) => id !== cardId));
  return {
    cards,
    columns: board.columns.map((col) => ({ ...col, cardIds: col.cardIds.filter((id) => id !== cardId) })),
  };
}

export function renameColumn(board: Board, columnId: string, title: string): Board {
  const cleanName = cleanTitle(title);
  if (!cleanName) return board;
  return {
    ...board,
    columns: board.columns.map((col) => (col.id === columnId ? { ...col, title: cleanName } : col)),
  };
}

/**
 * Moves a card to another column (or within the same one).
 * `toIndex` is the position in the target column after the card is removed from its old place;
 * omitted means "at the end".
 */
export function moveCard(board: Board, cardId: string, toColumnId: string, toIndex?: number): Board {
  const from = findColumnOfCard(board, cardId);
  const to = board.columns.find((c) => c.id === toColumnId);
  if (!from || !to) return board;

  const without = (ids: string[]) => ids.filter((id) => id !== cardId);
  return {
    ...board,
    columns: board.columns.map((col) => {
      if (col.id === from.id && col.id !== to.id) return { ...col, cardIds: without(col.cardIds) };
      if (col.id !== to.id) return col;
      const ids = without(col.cardIds);
      const index = toIndex === undefined ? ids.length : Math.max(0, Math.min(toIndex, ids.length));
      return { ...col, cardIds: [...ids.slice(0, index), cardId, ...ids.slice(index)] };
    }),
  };
}
