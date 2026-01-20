import type { Editor as SlateEditor } from "slate";
import { Range as SlateRange } from "slate";
import { ReactEditor } from "slate-react";

export function getDOMRange(
  editor: SlateEditor,
  range: SlateRange
): Range | undefined {
  try {
    return ReactEditor.toDOMRange(editor, range);
  } catch {
    // First attempt failed.
  }

  if (!SlateRange.isCollapsed(range)) {
    try {
      return ReactEditor.toDOMRange(editor, {
        anchor: range.anchor,
        focus: range.anchor,
      });
    } catch {
      // Second attempt with a collapsed range also failed.
    }
  }

  return undefined;
}
