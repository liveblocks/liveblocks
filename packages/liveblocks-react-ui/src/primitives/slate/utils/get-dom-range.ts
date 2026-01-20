import type { Editor as SlateEditor, Range as SlateRange } from "slate";
import { ReactEditor } from "slate-react";

const MAX_RETRIES = 3;

export function getDOMRange(
  editor: SlateEditor,
  range: SlateRange,
  retries: number = MAX_RETRIES
): Range | undefined {
  if (retries <= 0) {
    return;
  }

  try {
    return ReactEditor.toDOMRange(editor, range);
  } catch (error) {
    return getDOMRange(
      editor,
      {
        anchor: range.anchor,
        focus: range.anchor,
      },
      retries - 1
    );
  }
}
