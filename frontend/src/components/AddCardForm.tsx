"use client";

import { useState } from "react";
import { parseTagInput } from "@/lib/text";

type NewCard = { title: string; details: string; tags: string[] };

const fieldClass =
  "w-full rounded-md border border-navy/15 bg-surface px-2 py-1.5 text-sm text-navy outline-none focus:border-primary";

function Form({ onAdd, onClose }: { onAdd: (card: NewCard) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [tags, setTags] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd({ title, details, tags: parseTagInput(tags) });
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="space-y-2 rounded-lg border border-navy/10 bg-surface p-2.5 shadow-sm"
    >
      <input
        autoFocus
        aria-label="Card title"
        placeholder="Card title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={fieldClass}
      />
      <textarea
        aria-label="Card details"
        placeholder="Details (optional)"
        rows={2}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className={`${fieldClass} resize-none`}
      />
      <input
        aria-label="Card tags"
        placeholder="#tags (optional)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className={fieldClass}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Add card
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-navy/5 hover:text-navy"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onAdd: (card: NewCard) => void };

/** The form only exists while it is open, so it always starts empty. */
export function AddCardForm({ open, onOpenChange, onAdd }: Props) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="w-full rounded-lg border border-dashed border-navy/20 px-3 py-2 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-surface"
      >
        + Add a card
      </button>
    );
  }
  return <Form onAdd={onAdd} onClose={() => onOpenChange(false)} />;
}
