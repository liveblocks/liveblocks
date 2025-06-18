import type { Location as SlateLocation } from "slate";
import { Editor as SlateEditor, Range as SlateRange } from "slate";

interface Options {
  filterVoids?: boolean;
}

export function getCharacterBefore<T extends SlateEditor>(
  editor: T,
  at: SlateLocation,
  options: Options = {}
) {
  const { filterVoids } = options;
  const before = SlateEditor.before(editor, at, {
    unit: "character",
    voids: filterVoids,
  });

  if (before) {
    const range = SlateEditor.range(
      editor,
      before,
      SlateRange.isRange(at) ? SlateRange.start(at) : at
    );
    const text = SlateEditor.string(editor, range);

    return {
      range,
      text,
      void: text.length === 0,
    };
  }

  return;
}

export function getCharacterAfter<T extends SlateEditor>(
  editor: T,
  at: SlateLocation,
  options: Options = {}
) {
  const { filterVoids } = options;
  const after = SlateEditor.after(editor, at, {
    unit: "character",
    voids: filterVoids,
  });

  if (after) {
    const range = SlateEditor.range(
      editor,
      after,
      SlateRange.isRange(at) ? SlateRange.end(at) : at
    );
    const text = SlateEditor.string(editor, range);

    return {
      range,
      text,
      void: text.length === 0,
    };
  }

  return;
}
