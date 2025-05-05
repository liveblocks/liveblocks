import type { Text } from "slate";
import { Editor as SlateEditor, Range as SlateRange } from "slate";

import type { ComposerBodyMarks } from "../../../types";
import { getCharacterAfter, getCharacterBefore } from "./get-character";

const defaultComposerBodyMarks: Required<ComposerBodyMarks> = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
};

export function getComposerBodyMarks(editor?: SlateEditor) {
  if (!editor) {
    return { ...defaultComposerBodyMarks };
  }

  const marks = SlateEditor.marks(editor);

  return { ...defaultComposerBodyMarks, ...marks };
}

export function isMarkActive<M = ComposerBodyMarks>(
  editor: SlateEditor,
  mark: keyof M
) {
  const marks = SlateEditor.marks(editor) as M | null;

  return marks ? marks[mark] === true : false;
}

export function filterActiveMarks(
  value: Text | ComposerBodyMarks | null | undefined
) {
  return Object.keys(value ?? {}).filter(
    (key) => key !== "text"
  ) as (keyof ComposerBodyMarks)[];
}

export function toggleMark(editor: SlateEditor, mark: keyof ComposerBodyMarks) {
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
