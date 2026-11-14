export type Card = { id: string; title: string; details: string };
export type Column = { id: string; title: string; cardIds: string[] };
export type Board = { columns: Column[]; cards: Record<string, Card> };

export function createInitialBoard(): Board {
  const cards: Card[] = [
    { id: "c1", title: "Plan the weekly review", details: "Pick a fixed slot and a short checklist." },
    { id: "c2", title: "Write onboarding notes", details: "How the board and the vault fit together." },
    { id: "c3", title: "Design the card layout", details: "Title, short details, quick actions menu." },
    { id: "c4", title: "Set up the sample vault", details: "A few fake notes so the demo is not empty." },
    { id: "c5", title: "Build drag and drop", details: "Move cards between columns with the mouse or keyboard." },
    { id: "c6", title: "Check color contrast", details: "Text and accents must stay readable." },
    { id: "c7", title: "Create the project plan", details: "Phases with success criteria." },
    { id: "c8", title: "Set up Git and the commit scanner", details: "Keep secrets and personal data out of the repo." },
  ];
  const columns: Column[] = [
    { id: "backlog", title: "Backlog", cardIds: ["c1", "c2"] },
    { id: "next", title: "Next", cardIds: ["c3", "c4"] },
    { id: "in-progress", title: "In progress", cardIds: ["c5"] },
    { id: "review", title: "Review", cardIds: ["c6"] },
    { id: "done", title: "Done", cardIds: ["c7", "c8"] },
  ];
  return { columns, cards: Object.fromEntries(cards.map((c) => [c.id, c])) };
}

export function findColumnOfCard(board: Board, cardId: string): Column | undefined {
  return board.columns.find((col) => col.cardIds.includes(cardId));
}

export function addCard(
  board: Board,
  columnId: string,
  title: string,
  details = "",
  id: string = crypto.randomUUID(),
): Board {
  const cleanTitle = title.trim();
  if (!cleanTitle || !board.columns.some((c) => c.id === columnId)) return board;
  return {
    cards: { ...board.cards, [id]: { id, title: cleanTitle, details: details.trim() } },
    columns: board.columns.map((col) =>
      col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col,
    ),
  };
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
  const cleanTitle = title.trim();
  if (!cleanTitle) return board;
  return {
    ...board,
    columns: board.columns.map((col) => (col.id === columnId ? { ...col, title: cleanTitle } : col)),
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
