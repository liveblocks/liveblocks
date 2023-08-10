import type { Editor, NodeEntry } from "slate";
import { Element, Node, Transforms } from "slate";

function enforceElementType<T extends Editor>(
  editor: T,
  [node, path]: NodeEntry,
  type: Element["type"]
) {
  if (Element.isElement(node) && node.type !== type) {
    Transforms.setNodes<Element>(
      editor,
      { type },
      {
        at: path,
      }
    );
  }
}

export function withNormalize<T extends Editor>(editor: T): T {
  const { normalizeNode } = editor;

  editor.normalizeNode = ([node, path]) => {
    if (path.length !== 1) {
      return;
    }

    if (Element.isElement(node) && node.type === "paragraph") {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (Element.isElement(child) && !editor.isInline(child)) {
          return Transforms.unwrapNodes(editor, { at: childPath });
        }
      }
    } else {
      return enforceElementType(editor, [node, path], "paragraph");
    }

    normalizeNode([node, path]);
  };

  return editor;
}
