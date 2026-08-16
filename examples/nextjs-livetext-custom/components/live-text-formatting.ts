import type { LiveTextAttributes, LiveTextData } from "@liveblocks/client";

// A selection as character offsets. `focus` is the caret and may be before
// `anchor` when selecting backwards
export type SelectionRange = { anchor: number; focus: number };

export type FormatKey = "bold" | "italic" | "strikethrough";

// Returns the attributes of the character at `index`
export function attributesAt(
  data: LiveTextData,
  index: number
): LiveTextAttributes | undefined {
  let offset = 0;
  for (const [segmentText, attributes] of data) {
    if (index < offset + segmentText.length) {
      return attributes;
    }
    offset += segmentText.length;
  }
  return undefined;
}

// Whether every character in the range has the attribute
export function isFormatActive(
  data: LiveTextData,
  range: SelectionRange,
  key: FormatKey
): boolean {
  const start = Math.min(range.anchor, range.focus);
  const end = Math.max(range.anchor, range.focus);

  if (start === end) {
    const attributes = attributesAt(data, start > 0 ? start - 1 : 0);
    return Boolean(attributes?.[key]);
  }

  let offset = 0;
  let overlaps = false;
  for (const [segmentText, attributes] of data) {
    const segmentStart = offset;
    const segmentEnd = offset + segmentText.length;
    offset = segmentEnd;

    if (segmentEnd <= start || segmentStart >= end) {
      continue;
    }
    if (!attributes?.[key]) {
      return false;
    }
    overlaps = true;
  }
  return overlaps;
}

export function isSelectionFormatted(
  data: LiveTextData,
  range: SelectionRange | null,
  key: FormatKey
): boolean {
  return range !== null && isFormatActive(data, range, key);
}
