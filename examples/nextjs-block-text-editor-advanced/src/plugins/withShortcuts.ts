import { Element, Point } from "slate";
import { Editor, Range, Transforms } from "slate";
import { BlockType } from "../types";

const SHORTCUTS: Record<string, BlockType> = {
  "*": BlockType.BulletedList,
  "-": BlockType.BulletedList,
  "+": BlockType.BulletedList,
  "#": BlockType.H1,
  "##": BlockType.H2,
  "###": BlockType.H3,
  "[]": BlockType.ToDo,
};

export function withShortcuts<T extends Editor>(editor: T): T {
  const { deleteBackward, insertText } = editor;

  editor.insertText = (text) => {
    const { selection } = editor;
    if (!selection || !text.endsWith(" ") || !Range.isCollapsed(selection)) {
      insertText(text);
      return;
    }

    const { anchor } = selection;
    const entry = Editor.above(editor, {
      match: Element.isElement,
      mode: "highest",
    });

    if (!entry) {
      insertText(text);
      return;
    }

    const [, path] = entry;
    const range = Editor.range(editor, anchor, Editor.start(editor, path));
    const beforeText = Editor.string(editor, range) + text.slice(0, -1);

    const type = SHORTCUTS[beforeText];
    if (!type) {
      insertText(text);
      return;
    }

    Transforms.select(editor, range);
    if (!Range.isCollapsed(range)) {
      Transforms.delete(editor);
    }

    const newProperties: Partial<Element> = { type };
    Transforms.setNodes(editor, newProperties, {
      match: Element.isElement,
      mode: "highest",
    });
  };

  editor.deleteBackward = (unit) => {
    const { selection } = editor;
    if (
      !selection ||
      !Range.isCollapsed(selection) ||
      unit === "line" ||
      unit === "block"
    ) {
      deleteBackward(unit);
      return;
    }

    const match = Editor.above(editor, {
      match: Element.isElement,
      mode: "highest",
    });

    if (!match) {
      deleteBackward(unit);
      return;
    }

    const [block, path] = match;
    if (
      block.type === BlockType.Paragraph ||
      !Editor.isStart(editor, selection.anchor, path)
    ) {
      deleteBackward(unit);
      return;
    }

    const newProperties: Partial<Element> = { type: BlockType.Paragraph };
    Transforms.setNodes(editor, newProperties);
  };

  return editor;
}
