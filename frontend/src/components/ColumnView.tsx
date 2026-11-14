"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/board";
import { AddCardForm } from "./AddCardForm";
import { CardView } from "./CardView";
import { Menu } from "./Menu";

type Props = {
  column: Column;
  cards: Card[];
  highlighted: boolean;
  onRename: (title: string) => void;
  onAddCard: (title: string, details: string) => void;
  onDeleteCard: (cardId: string) => void;
};

export function ColumnView({ column, cards, highlighted, onRename, onAddCard, onDeleteCard }: Props) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [editing, setEditing] = useState(false);
  const headingId = `column-${column.id}`;

  const commit = (value: string) => {
    setEditing(false);
    onRename(value);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col rounded-xl border-t-[3px] border-accent bg-navy/[0.045] p-3 transition-shadow ${
        highlighted ? "ring-2 ring-primary/60" : ""
      }`}
    >
      <header className="mb-3 flex items-center gap-2">
        {editing ? (
          <input
            autoFocus
            aria-label={`Rename column ${column.title}`}
            defaultValue={column.title}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget.value);
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded-md border border-primary bg-white px-2 py-1 text-sm font-semibold text-navy outline-none"
          />
        ) : (
          <h2 id={headingId} className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
            {column.title}
          </h2>
        )}
        <span
          aria-label={`${cards.length} cards`}
          className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-muted"
        >
          {cards.length}
        </span>
        <Menu
          label={`Column options for ${column.title}`}
          items={[{ label: "Rename column", onSelect: () => setEditing(true) }]}
        />
      </header>

      <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardView key={card.id} card={card} onDelete={() => onDeleteCard(card.id)} />
          ))}
        </SortableContext>
      </div>

      <div className="mt-3">
        <AddCardForm onAdd={onAddCard} />
      </div>
    </section>
  );
}
