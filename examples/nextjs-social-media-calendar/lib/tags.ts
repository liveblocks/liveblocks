/** Trims and tidies a label typed by someone; empty when nothing's left. */
export function normalizeTag(input: string) {
  return input.trim().replace(/\s+/g, " ").slice(0, 24);
}

// A light tint with a border and text in the same hue.
const TAG_COLORS = [
  "border-indigo-300 bg-indigo-50 text-indigo-600",
  "border-sky-300 bg-sky-50 text-sky-700",
  "border-emerald-300 bg-emerald-50 text-emerald-700",
  "border-amber-300 bg-amber-50 text-amber-700",
  "border-rose-300 bg-rose-50 text-rose-700",
  "border-teal-300 bg-teal-50 text-teal-700",
  "border-orange-300 bg-orange-50 text-orange-700",
  "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700",
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
