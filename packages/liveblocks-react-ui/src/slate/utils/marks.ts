import type { EditorMarks, Text } from "slate";
import { Editor as SlateEditor } from "slate";

import { getCharacterAfter, getCharacterBefore } from "./get-character";
import { isSelectionCollapsed } from "./is-selection-collapsed";

export function isMarkActive(editor: SlateEditor, mark: keyof EditorMarks) {
  const marks = SlateEditor.marks(editor);

  return marks ? marks[mark] === true : false;
}

export function getActiveMarks(editor: SlateEditor) {
  const marks = SlateEditor.marks(editor);

  return getMarks(marks);
}

export function getMarks(todo: Text | EditorMarks | null | undefined) {
  return Object.keys(todo ?? {}).filter(
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
  if (isSelectionCollapsed(editor.selection)) {
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
