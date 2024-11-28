import type { EditorMarks, Text } from "slate";
import { Editor as SlateEditor, Range as SlateRange } from "slate";

import { getCharacterAfter, getCharacterBefore } from "./get-character";

const defaultMarks: Required<EditorMarks> = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
};

export function isMarkActive(editor: SlateEditor, mark: keyof EditorMarks) {
  const marks = SlateEditor.marks(editor);

  return marks ? marks[mark] === true : false;
}

export function getMarks(editor?: SlateEditor) {
  if (!editor) {
    return { ...defaultMarks };
  }

  const marks = SlateEditor.marks(editor);

  return { ...defaultMarks, ...marks };
}

export function filterActiveMarks(
  value: Text | EditorMarks | null | undefined
) {
  return Object.keys(value ?? {}).filter(
    (key) => key !== "text"
  ) as (keyof EditorMarks)[];
}

export function toggleMark(editor: SlateEditor, mark: keyof EditorMarks) {
  const isActive = isMarkActive(editor, mark);

  if (isActive) {
    SlateEditor.removeMark(editor, mark);
  } else {
    SlateEditor.addMark(editor, mark, true);
  }
}

export function removeMarks(editor: SlateEditor) {
  const marks = SlateEditor.marks(editor);

  if (marks) {
    for (const mark in marks) {
      SlateEditor.removeMark(editor, mark);
    }
  }
}

export function leaveMarkEdge(editor: SlateEditor, edge: "start" | "end") {
  if (editor.selection && SlateRange.isCollapsed(editor.selection)) {
    const marks = Object.keys(SlateEditor.marks(editor) ?? {});

    if (marks.length > 0) {
      const sibling =
        edge === "start"
          ? getCharacterBefore(editor, editor.selection)
          : getCharacterAfter(editor, editor.selection);

      if (!sibling) {
        removeMarks(editor);
      }
    }
  }
}
