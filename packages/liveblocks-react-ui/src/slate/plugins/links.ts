import type { Editor } from "slate";
import { Element, Node, Transforms } from "slate";

import type { ComposerBodyLink } from "../../types";
import { isPlainText, isText } from "../utils/is-text";
import { filterActiveMarks } from "../utils/marks";

export function isUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export function withLinks(editor: Editor): Editor {
  const { isInline, normalizeNode } = editor;

  editor.isInline = (element) => {
    return element.type === "link" ? true : isInline(element);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Prevent rich text within links by removing all marks of inner text nodes
    if (isText(node)) {
      const parentNode = Node.parent(editor, path);

      if (isComposerBodyLink(parentNode)) {
        if (!isPlainText(node)) {
          const marks = filterActiveMarks(node);

          Transforms.unsetNodes(editor, marks, { at: path });
        }
      }
    }

    // Prevent nested or empty links
    if (isComposerBodyLink(node)) {
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

export function isComposerBodyLink(node: Node): node is ComposerBodyLink {
  return Element.isElement(node) && node.type === "link";
}
