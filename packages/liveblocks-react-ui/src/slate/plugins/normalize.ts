import type { Editor } from "slate";
import { Element, Node, Transforms } from "slate";

export function withNormalize(editor: Editor) {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Paragraphs should only contain inline elements
    if (Element.isElement(node) && node.type === "paragraph") {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (Element.isElement(child) && !editor.isInline(child)) {
          Transforms.unwrapNodes(editor, { at: childPath });
          return;
        }
      }
    }

    // Links cannot be nested or empty
    if (
      Element.isElement(node) &&
      (node.type === "auto-link" || node.type === "custom-link")
    ) {
      if (
        node.children.length === 0 ||
        (node.children.length === 1 && node.children[0]?.text === "")
      ) {
        Transforms.removeNodes(editor, { at: path });
      }
    }

    normalizeNode(entry);
  };

  return editor;
}
