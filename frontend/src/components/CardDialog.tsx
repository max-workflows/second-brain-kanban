"use client";

import { useState } from "react";
import type { Card } from "@/lib/board";
import { parseTagInput } from "@/lib/text";

type Props = {
  card: Card;
  onSave: (patch: { title: string; details: string; tags: string[] }) => void;
  onClose: () => void;
};

const fieldClass =
  "w-full rounded-md border border-navy/15 bg-surface px-2.5 py-1.5 text-sm text-navy outline-none focus:border-primary";

export function CardDialog({ card, onSave, onClose }: Props) {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [tags, setTags] = useState(card.tags.map((t) => `#${t}`).join(" "));
  const saved = !card.id.startsWith("tmp-");

  const submit = () => {
    if (!title.trim()) return;
    onSave({ title, details, tags: parseTagInput(tags) });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Edit card"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full max-w-lg space-y-3 rounded-xl bg-surface p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-navy">Edit card</h2>
        <label className="block text-xs font-medium text-muted">
          Title
          <input autoFocus className={`${fieldClass} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-xs font-medium text-muted">
          Details
          <textarea
            className={`${fieldClass} mt-1 resize-y`}
            rows={8}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-muted">
          Tags
          <input
            className={`${fieldClass} mt-1`}
            placeholder="#planning #docs"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </label>
        {saved && (
          <p className="text-xs text-muted">
            Stored in <code className="rounded bg-navy/5 px-1">Tasks/{card.id}.md</code>
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-navy/5 hover:text-navy"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
