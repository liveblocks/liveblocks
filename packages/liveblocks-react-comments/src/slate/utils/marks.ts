import { Editor as SlateEditor } from "slate";

import type { ComposerBodyMarks } from "../../types";
import { getCharacterAfter, getCharacterBefore } from "./get-character";
import { isSelectionCollapsed } from "./is-selection-collapsed";

export function isMarkActive(editor: SlateEditor, format: ComposerBodyMarks) {
  const marks = SlateEditor.marks(editor);

  return marks ? marks[format] === true : false;
}

export function toggleMark(editor: SlateEditor, format: ComposerBodyMarks) {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    SlateEditor.removeMark(editor, format);
  } else {
    SlateEditor.addMark(editor, format, true);
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
