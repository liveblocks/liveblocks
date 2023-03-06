import { Editor, Element, Node, Transforms } from "slate";
import { BlockType } from "../types";

// TODO: Add better handling for "continuos" blocks like checklists
export function withResetBlockOnBreak<T extends Editor>(editor: T): T {
  const { insertBreak } = editor;
  editor.insertBreak = () => {
    const { selection } = editor;
    if (!selection) {
      return insertBreak();
    }

    const rootAnchorPath = selection.anchor.path.slice(0, 1);
    if (Editor.isStart(editor, selection.anchor, rootAnchorPath)) {
      return Editor.withoutNormalizing(editor, () => {
        Transforms.splitNodes(editor, { always: true });
        Transforms.setNodes(
          editor,
          { type: BlockType.Paragraph },
          { at: rootAnchorPath }
        );
      });
    }

    const anchorNode = Node.get(editor, rootAnchorPath);
    if (Element.isElement(anchorNode) && anchorNode.type === BlockType.ToDo) {
      Transforms.splitNodes(editor, { always: true });
      Transforms.setNodes(editor, { checked: false });
      return;
    }

    Transforms.splitNodes(editor, { always: true });
    Transforms.setNodes(editor, { type: BlockType.Paragraph });
  };

  return editor;
}
