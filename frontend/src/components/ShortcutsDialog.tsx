"use client";

const SHORTCUTS: [keys: string, what: string][] = [
  ["N", "New card in the first column"],
  ["1 – 9", "New card in that column"],
  ["E", "Edit the card that has focus"],
  ["Space, then ← → ↑ ↓, then Space", "Move the card that has focus (Esc cancels)"],
  ["T", "Change theme: system, light, dark"],
  ["?", "Show this list"],
  ["Esc", "Close a window or a form"],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        ref={(el) => el?.focus()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl outline-none"
      >
        <h2 className="mb-3 text-base font-semibold text-navy">Keyboard shortcuts</h2>
        <dl className="space-y-2 text-sm">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">{what}</dt>
              <dd>
                <kbd className="whitespace-nowrap rounded-md border border-navy/15 bg-navy/5 px-1.5 py-0.5 text-xs font-medium text-navy">
                  {keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">Shortcuts work by physical key, on any keyboard layout.</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
