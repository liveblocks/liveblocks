import { Editor as SlateEditor } from "slate";

import type { ComposerBodyMarks } from "../../types";

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

export function clearMarks(editor: SlateEditor) {
  const marks = SlateEditor.marks(editor);

  if (marks) {
    for (const mark in marks) {
      SlateEditor.removeMark(editor, mark);
    }
  }
}
