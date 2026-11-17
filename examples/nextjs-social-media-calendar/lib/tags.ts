/** Trims and tidies a label typed by someone; empty when nothing's left. */
export function normalizeTag(input: string) {
  return input.trim().replace(/\s+/g, " ").slice(0, 24);
}

const TAG_COLORS = [
  "bg-violet-100 text-violet-800",
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-fuchsia-100 text-fuchsia-800",
] as const;

/**
 * The same label always gets the same color, on every card and for everyone:
 * picked from a small palette by hashing its name.
 */
export function tagColor(tag: string) {
  let hash = 0;
  for (const char of tag.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}
