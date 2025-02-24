import type { Editor } from "slate";
import { Element, Node, Range, Transforms } from "slate";

import type { ComposerBodyCustomLink } from "../../types";
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

export function withCustomLinks(editor: Editor): Editor {
  const { isInline, normalizeNode, insertData } = editor;

  editor.isInline = (element) => {
    return element.type === "custom-link" ? true : isInline(element);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    if (isText(node)) {
      const parentNode = Node.parent(editor, path);

      // Prevent rich text within custom links by removing all marks of inner text nodes
      if (isComposerBodyCustomLink(parentNode)) {
        if (!isPlainText(node)) {
          const marks = filterActiveMarks(node);

          Transforms.unsetNodes(editor, marks, { at: path });
        }
      }
    }

    normalizeNode(entry);
  };

  // Create custom links when pasting URLs while some text is selected
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
            // If all conditions are met, wrap the selected nodes in a custom link
            Transforms.wrapNodes<ComposerBodyCustomLink>(
              editor,
              {
                type: "custom-link",
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

export function isComposerBodyCustomLink(
  node: Node
): node is ComposerBodyCustomLink {
  return Element.isElement(node) && node.type === "custom-link";
}
