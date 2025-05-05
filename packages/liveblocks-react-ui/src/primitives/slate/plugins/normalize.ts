import type { Editor as SlateEditor } from "slate";
import {
  Element as SlateElement,
  Node as SlateNode,
  Transforms as SlateTransforms,
} from "slate";

export function withNormalize(editor: SlateEditor) {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Paragraphs should only contain inline elements
    if (SlateElement.isElement(node) && node.type === "paragraph") {
      for (const [child, childPath] of SlateNode.children(editor, path)) {
        if (SlateElement.isElement(child) && !editor.isInline(child)) {
          SlateTransforms.unwrapNodes(editor, { at: childPath });
          return;
        }
      }
    }

    normalizeNode(entry);
  };

  return editor;
}
