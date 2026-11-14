import type { Board, Card, Column } from "@/lib/board";

/** A small board used by tests. */
export function sampleBoard(): Board {
  const cards: Card[] = [
    { id: "c1", title: "Plan the weekly review", details: "Pick a fixed slot and a short checklist.", tags: ["planning"] },
    { id: "c2", title: "Write onboarding notes", details: "How the board and the vault fit together.", tags: ["docs"] },
    { id: "c3", title: "Design the card layout", details: "Title, short details, quick actions menu.", tags: ["design"] },
    { id: "c4", title: "Set up the sample vault", details: "A few fake notes so the demo is not empty.", tags: ["vault"] },
    { id: "c5", title: "Build drag and drop", details: "Move cards between columns with the mouse or keyboard.", tags: ["frontend"] },
    { id: "c6", title: "Check color contrast", details: "Text and accents must stay readable.", tags: ["design", "a11y"] },
    { id: "c7", title: "Create the project plan", details: "Phases with success criteria.", tags: ["planning"] },
    { id: "c8", title: "Set up Git and the commit scanner", details: "Keep secrets and personal data out of the repo.", tags: ["git", "security"] },
  ];
  const columns: Column[] = [
    { id: "col-0", title: "Backlog", cardIds: ["c1", "c2"] },
    { id: "col-1", title: "Next", cardIds: ["c3", "c4"] },
    { id: "col-2", title: "In progress", cardIds: ["c5"] },
    { id: "col-3", title: "Review", cardIds: ["c6"] },
    { id: "col-4", title: "Done", cardIds: ["c7", "c8"] },
  ];
  return { columns, cards: Object.fromEntries(cards.map((c) => [c.id, c])) };
}
