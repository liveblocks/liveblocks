import type { Editor } from "slate";
import { Element, Node, Range, Transforms } from "slate";

import type { ComposerBodyLink } from "../../types";
import { isPlainText, isText } from "../utils/is-text";
import { filterActiveMarks } from "../utils/marks";
import { selectionContainsInlines } from "../utils/selection-contains-inlines";

function isUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export function withLinks(editor: Editor): Editor {
  const { isInline, normalizeNode, insertData } = editor;

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

  // Create links when pasting URLs while some text is selected
  editor.insertData = (data) => {
    const { selection } = editor;
    const pastedText = data.getData("text/plain");

    // Keep track of whether the default behavior should be invoked
    // This allows us to sequence multiple conditions in a performant way,
    // ordering them by likelihood/cost and stopping early whenever possible
    let shouldInvokeDefaultBehavior = true;

    // Check if the selection is a range
    if (selection && !Range.isCollapsed(selection)) {
      // Check if the selection is contained in a single block
      if (selection.anchor.path[0] === selection.focus.path[0]) {
        // Check if the pasted text is a valid URL
        if (isUrl(pastedText)) {
          // Check if the selection only contains (rich and/or plain) text nodes
          if (!selectionContainsInlines(editor, (node) => !isText(node))) {
            // If all conditions are met, wrap the selected nodes in a link
            Transforms.wrapNodes<ComposerBodyLink>(
              editor,
              {
                type: "link",
                url: pastedText,
                children: [],
              },
              {
                at: selection,
                split: true,
                match: isPlainText,
              }
            );
            shouldInvokeDefaultBehavior = false;
          }
        }
      }
    }

    if (shouldInvokeDefaultBehavior) {
      insertData(data);
    }
  };

  return editor;
}

export function isComposerBodyLink(node: Node): node is ComposerBodyLink {
  return Element.isElement(node) && node.type === "link";
}
