"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "@/lib/board";
import { Menu } from "./Menu";

const cardClass =
  "rounded-lg border border-navy/10 bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md";

/** Static card used inside the drag overlay. */
export function CardPreview({ card }: { card: Card }) {
  return (
    <div className={`${cardClass} cursor-grabbing shadow-lg`}>
      <p className="text-sm font-medium text-navy">{card.title}</p>
      {card.details && <p className="mt-1 line-clamp-2 text-xs text-muted">{card.details}</p>}
    </div>
  );
}

export function CardView({ card, onDelete }: { card: Card; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${cardClass} cursor-grab touch-none ${isDragging ? "opacity-40" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-navy">{card.title}</p>
        <Menu
          label={`Card options for ${card.title}`}
          items={[{ label: "Delete card", onSelect: onDelete, danger: true }]}
        />
      </div>
      {card.details && <p className="mt-1 line-clamp-2 text-xs text-muted">{card.details}</p>}
    </div>
  );
}
