"use client";

import { useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  addCard,
  createInitialBoard,
  deleteCard,
  findColumnOfCard,
  moveCard,
  renameColumn,
  type Board as BoardState,
} from "@/lib/board";
import { CardPreview } from "./CardView";
import { ColumnView } from "./ColumnView";

/** Column that a drag target belongs to: the target is either a column or a card inside one. */
function columnIdOf(board: BoardState, targetId: string): string | undefined {
  if (board.columns.some((c) => c.id === targetId)) return targetId;
  return findColumnOfCard(board, targetId)?.id;
}

export function Board() {
  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    setOverColumnId(e.over ? (columnIdOf(board, String(e.over.id)) ?? null) : null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverColumnId(null);
    if (!e.over) return;
    const cardId = String(e.active.id);
    const overId = String(e.over.id);
    const toColumnId = columnIdOf(board, overId);
    if (!toColumnId) return;
    const isColumn = toColumnId === overId;
    const toIndex = isColumn
      ? undefined
      : board.columns.find((c) => c.id === toColumnId)!.cardIds.indexOf(overId);
    setBoard((b) => moveCard(b, cardId, toColumnId, toIndex));
  };

  const activeCard = activeId ? board.cards[activeId] : undefined;

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverColumnId(null);
      }}
    >
      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[1100px] grid-cols-5 items-start gap-4">
          {board.columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              cards={column.cardIds.map((id) => board.cards[id])}
              highlighted={overColumnId === column.id && activeId !== null}
              onRename={(title) => setBoard((b) => renameColumn(b, column.id, title))}
              onAddCard={(title, details) => setBoard((b) => addCard(b, column.id, title, details))}
              onDeleteCard={(cardId) => setBoard((b) => deleteCard(b, cardId))}
            />
          ))}
        </div>
      </div>
      <DragOverlay>{activeCard ? <CardPreview card={activeCard} /> : null}</DragOverlay>
    </DndContext>
  );
}
