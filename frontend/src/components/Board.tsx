"use client";

import { useEffect, useState } from "react";
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
import { findColumnOfCard, type Board as BoardState } from "@/lib/board";
import { isTypingTarget, shortcutOf } from "@/lib/dom";
import { useBoard } from "@/lib/useBoard";
import { useTheme } from "@/lib/useTheme";
import { CardDialog } from "./CardDialog";
import { CardPreview } from "./CardView";
import { ColumnView } from "./ColumnView";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { ThemeToggle } from "./ThemeToggle";

/** Column that a drag target belongs to: the target is either a column or a card inside one. */
function columnIdOf(board: BoardState, targetId: string): string | undefined {
  if (board.columns.some((c) => c.id === targetId)) return targetId;
  return findColumnOfCard(board, targetId)?.id;
}

const alertClass = "rounded-lg border border-danger-border bg-danger-bg text-sm text-danger";

export function Board({ pollMs }: { pollMs?: number }) {
  const { board, vault, error, dispatch, setPaused, reload } = useBoard({ pollMs });
  const { cycle: cycleTheme } = useTheme();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setPaused(activeId !== null || openCardId !== null);
  }, [activeId, openCardId, setPaused]);

  // Single-key shortcuts. They stay quiet while typing, while a window is open and while a card is being dragged.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (isTypingTarget(e.target) || openCardId !== null || helpOpen || activeId !== null) return;
      const key = shortcutOf(e);
      if (!key) return;
      if (key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (key === "t") {
        cycleTheme();
      } else if (board) {
        const position = key === "n" ? 1 : /^[1-9]$/.test(key) ? Number(key) : 0;
        const column = position ? board.columns[position - 1] : undefined;
        if (column) {
          e.preventDefault();
          setAddingIn(column.id);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [board, openCardId, helpOpen, activeId, cycleTheme]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!board) {
    return error ? (
      <div role="alert" className={`max-w-md p-4 ${alertClass}`}>
        <p>{error}</p>
        <button type="button" onClick={() => void reload()} className="mt-2 font-medium underline">
          Try again
        </button>
      </div>
    ) : (
      <p className="text-sm text-muted">Loading board…</p>
    );
  }

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
    const toIndex =
      toColumnId === overId ? undefined : board.columns.find((c) => c.id === toColumnId)!.cardIds.indexOf(overId);
    dispatch({ type: "moveCard", id: cardId, toColumnId, toIndex });
  };

  const activeCard = activeId ? board.cards[activeId] : undefined;
  const openCard = openCardId ? board.cards[openCardId] : undefined;

  return (
    <>
      {error && (
        <p role="alert" className={`mb-3 px-3 py-2 ${alertClass}`}>
          {error}
        </p>
      )}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Vault: <span className="font-medium text-navy">{vault}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            title="Keyboard shortcuts (?)"
            className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-navy/5 hover:text-navy"
          >
            Shortcuts <kbd className="ml-0.5 rounded border border-navy/15 px-1 font-medium">?</kbd>
          </button>
          <ThemeToggle />
        </div>
      </div>
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
          <div
            className="grid items-start gap-4"
            style={{ gridTemplateColumns: `repeat(${board.columns.length}, minmax(220px, 1fr))` }}
          >
            {board.columns.map((column) => (
              <ColumnView
                key={column.id}
                column={column}
                cards={column.cardIds.map((id) => board.cards[id])}
                highlighted={overColumnId === column.id && activeId !== null}
                adding={addingIn === column.id}
                onAddingChange={(open) => setAddingIn(open ? column.id : null)}
                onRename={(title) => dispatch({ type: "renameColumn", columnId: column.id, title })}
                onAddCard={(card) => dispatch({ type: "addCard", columnId: column.id, ...card })}
                onOpenCard={setOpenCardId}
                onDeleteCard={(id) => dispatch({ type: "deleteCard", id })}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{activeCard ? <CardPreview card={activeCard} /> : null}</DragOverlay>
      </DndContext>
      {openCard && (
        <CardDialog
          key={openCard.id}
          card={openCard}
          onSave={(patch) => dispatch({ type: "updateCard", id: openCard.id, ...patch })}
          onClose={() => setOpenCardId(null)}
        />
      )}
      {helpOpen && <ShortcutsDialog onClose={() => setHelpOpen(false)} />}
    </>
  );
}
