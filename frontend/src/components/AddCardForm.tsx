"use client";

import { useState } from "react";

export function AddCardForm({ onAdd }: { onAdd: (title: string, details: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  const close = () => {
    setOpen(false);
    setTitle("");
    setDetails("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-navy/20 px-3 py-2 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-white"
      >
        + Add a card
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title, details);
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      className="space-y-2 rounded-lg border border-navy/10 bg-white p-2.5 shadow-sm"
    >
      <input
        autoFocus
        aria-label="Card title"
        placeholder="Card title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-navy/15 px-2 py-1.5 text-sm text-navy outline-none focus:border-primary"
      />
      <textarea
        aria-label="Card details"
        placeholder="Details (optional)"
        rows={2}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="w-full resize-none rounded-md border border-navy/15 px-2 py-1.5 text-sm text-navy outline-none focus:border-primary"
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
          onClick={close}
          className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-navy/5 hover:text-navy"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
