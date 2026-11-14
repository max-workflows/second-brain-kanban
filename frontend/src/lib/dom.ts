/** True when the person is typing somewhere, so single-key shortcuts must stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Shortcuts use the physical key (`code`), not the typed letter, so they work on any keyboard layout,
 * for example Ukrainian where the N key types "т".
 */
export function shortcutOf(e: Pick<KeyboardEvent, "code" | "key" | "shiftKey">): string | null {
  if (e.key === "?" || (e.code === "Slash" && e.shiftKey)) return "?";
  if (e.shiftKey) return null;
  const letter = /^Key([A-Z])$/.exec(e.code);
  if (letter) return letter[1].toLowerCase();
  const digit = /^Digit([1-9])$/.exec(e.code);
  return digit ? digit[1] : null;
}
