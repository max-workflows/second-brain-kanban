/** Single-line card title that is safe inside a `[[wikilink|alias]]`. */
export function cleanTitle(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\|/g, "/")
    .trim()
    .slice(0, 200);
}

/** Obsidian-style tags: lowercase, no spaces, not digits only, no duplicates. */
export function normalizeTags(input: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of input) {
    const tag = raw
      .trim()
      .replace(/^#+/, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_/-]+/gu, "-")
      .replace(/^-+|-+$/g, "");
    if (tag && /\D/.test(tag) && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 10);
}

/** Tags typed by a person: separated by commas or spaces, with or without `#`. */
export function parseTagInput(text: string): string[] {
  return normalizeTags(text.split(/[\s,]+/));
}

/** The short text shown on a card: the first paragraph of the details. */
export function firstParagraph(details: string): string {
  return details.trim().split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ");
}

export function slugify(text: string, max = 40): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
  return slug || "card";
}
