import { nanoid } from "nanoid";
import { Editor, Element, Node, Text, Transforms } from "slate";
import { STYLE_MARKS } from "../constants";
import { BlockType } from "../types";

function ensureFirstBlockIsTitle(editor: Editor) {
  const { normalizeNode } = editor;
  editor.normalizeNode = (entry) => {
    const [, path] = entry;
    if (path.length !== 0) {
      return normalizeNode(entry);
    }

    if (editor.children.length === 0) {
      const title: Element = {
        id: nanoid(),
        type: BlockType.Title,
        children: [{ text: "Untitled" }],
      };

      Transforms.insertNodes(editor, title, { at: [0] });
      return;
    }

    const firstChild = editor.children[0];
    if (Element.isElement(firstChild) && firstChild.type === BlockType.Title) {
      return;
    }

    Transforms.setNodes(editor, { type: BlockType.Title }, { at: [0] });
  };
}

function ensureTitleHasNoStyling(editor: Editor) {
  const { normalizeNode } = editor;
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    if (!Element.isElement(node) || node.type !== BlockType.Title) {
      return normalizeNode(entry);
    }

    let normalized = false;
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      const childPath = [...path, i];

      if (!Text.isText(child)) {
        Transforms.unwrapNodes(editor, { at: childPath, voids: true });
        normalized = true;
        continue;
      }

      if (STYLE_MARKS.some((mark) => child[mark])) {
        Transforms.unsetNodes(editor, STYLE_MARKS, { at: childPath });
        normalized = true;
      }
    }

    if (!normalized) {
      return normalizeNode(entry);
    }
  };
}

function ensureTitleOnlyExistsAsFirstElement(editor: Editor) {
  const { normalizeNode } = editor;
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    if (
      path[0] === 0 ||
      !Element.isElement(node) ||
      node.type !== BlockType.Title
    ) {
      return normalizeNode(entry);
    }

    Transforms.setNodes(editor, { type: BlockType.Paragraph }, { at: path });
  };
}

export function withLayout<T extends Editor>(editor: T): T {
  ensureFirstBlockIsTitle(editor);
  ensureTitleOnlyExistsAsFirstElement(editor);
  ensureTitleHasNoStyling(editor);
  return editor;
}
