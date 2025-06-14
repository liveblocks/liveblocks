import type { Editor as SlateEditor, Range as SlateRange } from "slate";
import { ReactEditor } from "slate-react";

export function getDOMRange(
  editor: SlateEditor,
  range: SlateRange
): Range | undefined {
  try {
    return ReactEditor.toDOMRange(editor, range);
  } catch (error) {
    return getDOMRange(editor, {
      anchor: range.anchor,
      focus: range.anchor,
    });
  }
}
