const STYLES = [
  "bg-primary/10 text-primary-fg",
  "bg-secondary/10 text-secondary-fg",
  "bg-accent/20 text-accent-fg",
  "bg-navy/10 text-navy",
];

/** The same tag always gets the same color. */
function styleFor(tag: string): string {
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return STYLES[hash % STYLES.length];
}

export function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styleFor(tag)}`}>
          #{tag}
        </li>
      ))}
    </ul>
  );
}
