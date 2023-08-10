import type { Location as SlateLocation } from "slate";
import { Editor as SlateEditor, Range as SlateRange } from "slate";

export function getPreviousCharacter<T extends SlateEditor>(
  editor: T,
  at: SlateLocation
) {
  const before = SlateEditor.before(editor, at, { unit: "character" });

  if (before) {
    const range = SlateEditor.range(
      editor,
      before,
      SlateRange.isRange(at) ? SlateRange.start(at) : at
    );

    return {
      range,
      text: SlateEditor.string(editor, range),
    };
  }

  return;
}
