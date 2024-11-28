import type { EditorMarks } from "slate";
import {
  Editor as SlateEditor,
  Range as SlateRange,
  Transforms as SlateTransforms,
} from "slate";

import { getCharacterBefore } from "../utils/get-character";
import { getMatchRange } from "../utils/get-match-range";
import { isEmptyString } from "../utils/is-empty-string";

interface MarkFormatter {
  type: "mark";
  mark: keyof EditorMarks;
  character: string;
}

type Formatter = MarkFormatter;

const formatters: Formatter[] = [
  {
    type: "mark",
    mark: "bold",
    character: "*",
  },
  {
    type: "mark",
    mark: "italic",
    character: "_",
  },
  {
    type: "mark",
    mark: "strikethrough",
    character: "~",
  },
  {
    type: "mark",
    mark: "code",
    character: "`",
  },
];
const markFormattingCharacters = formatters
  .filter((formatter) => formatter.type === "mark")
  .map((formatter) => formatter.character);

function formatMark<T extends SlateEditor>(
  editor: T,
  text: string,
  formatter: MarkFormatter
): boolean {
  if (text !== formatter.character) {
    return false;
  }

  const match = getMatchRange(editor, editor.selection!, [formatter.character]);

  // Check if the match exists and is not empty
  if (!match || SlateRange.isCollapsed(match)) {
    return false;
  }

  const formattingCharacter = getCharacterBefore(editor, match);

  // Check if the match is preceded by the formatting character
  if (
    !formattingCharacter ||
    formattingCharacter.text !== formatter.character
  ) {
    return false;
  }

  const beforeCharacter = getCharacterBefore(editor, formattingCharacter.range);

  // Check if the formatting character is preceded by a non-whitespace character (or another formatting character)
  if (
    beforeCharacter &&
    !markFormattingCharacters.includes(beforeCharacter.text) &&
    !isEmptyString(beforeCharacter.text)
  ) {
    return false;
  }

  const matchText = SlateEditor.string(editor, match);

  // Check if the match has leading/trailing whitespace
  if (matchText.trim() !== matchText) {
    return false;
  }

  // Set the match to the expected mark
  SlateTransforms.select(editor, match);
  editor.addMark(formatter.mark, true);

  // Set the selection at the end of the match and reset formatting
  SlateTransforms.collapse(editor, { edge: "end" });
  editor.removeMark(formatter.mark);

  // Delete the formatting character
  SlateTransforms.delete(editor, {
    at: formattingCharacter.range,
  });

  return true;
}

export function withAutoFormatting<T extends SlateEditor>(editor: T): T {
  const { insertText } = editor;

  editor.insertText = (text, options) => {
    if (!editor.selection || !SlateRange.isCollapsed(editor.selection)) {
      return insertText(text, options);
    }

    let shouldInsertText = true;

    for (const formatter of formatters) {
      if (formatter.type === "mark") {
        if (formatMark(editor, text, formatter)) {
          shouldInsertText = false;
        }
      }
    }

    if (shouldInsertText) {
      insertText(text, options);
    }
  };

  return editor;
}
