"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@/lib/board";
import { firstParagraph } from "@/lib/text";
import { Menu } from "./Menu";
import { Tags } from "./Tags";

const cardClass =
  "rounded-lg border border-navy/10 bg-surface px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md";

/** Static card used inside the drag overlay. */
export function CardPreview({ card }: { card: Card }) {
  return (
    <div className={`${cardClass} cursor-grabbing shadow-lg`}>
      <p className="text-sm font-medium text-navy">{card.title}</p>
      {card.details && <p className="mt-1 line-clamp-2 text-xs text-muted">{firstParagraph(card.details)}</p>}
      <Tags tags={card.tags} />
    </div>
  );
}

type Props = { card: Card; onOpen: () => void; onDelete: () => void };

export function CardView({ card, onOpen, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${cardClass} cursor-grab touch-none ${isDragging ? "opacity-40" : ""}`}
      onClick={onOpen}
      {...attributes}
      {...listeners}
      onKeyDown={(e) => {
        // Keep the keyboard dragging of dnd-kit, and add "E" to edit the card that has focus.
        (listeners as Record<string, ((event: React.KeyboardEvent) => void) | undefined> | undefined)?.onKeyDown?.(e);
        if (e.target === e.currentTarget && e.code === "KeyE" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-navy">{card.title}</p>
        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            label={`Card options for ${card.title}`}
            items={[
              { label: "Edit card", onSelect: onOpen },
              { label: "Delete card", onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </div>
      {card.details && <p className="mt-1 line-clamp-2 text-xs text-muted">{firstParagraph(card.details)}</p>}
      <Tags tags={card.tags} />
    </div>
  );
}
