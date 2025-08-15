import { isUrl } from "@liveblocks/core";
import type { Editor as SlateEditor } from "slate";
import {
  Element as SlateElement,
  Node as SlateNode,
  Range as SlateRange,
  Transforms as SlateTransforms,
} from "slate";

import type { ComposerBodyCustomLink } from "../../../../types";
import { isPlainText, isText } from "../../../slate/utils/is-text";
import { filterActiveMarks } from "../../../slate/utils/marks";
import { selectionContainsInlines } from "../../../slate/utils/selection-contains-inlines";

export function withCustomLinks(editor: SlateEditor): SlateEditor {
  const { isInline, normalizeNode, insertData } = editor;

  editor.isInline = (element) => {
    return element.type === "custom-link" ? true : isInline(element);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Prevent nested or empty custom links
    if (SlateElement.isElement(node) && node.type === "custom-link") {
      if (
        node.children.length === 0 ||
        (node.children.length === 1 && node.children[0]?.text === "")
      ) {
        SlateTransforms.removeNodes(editor, { at: path });
      }
    }

    if (isText(node)) {
      const parentNode = SlateNode.parent(editor, path);

      // Prevent rich text within custom links by removing all marks of inner text nodes
      if (isComposerBodyCustomLink(parentNode)) {
        if (!isPlainText(node)) {
          const marks = filterActiveMarks(node);

          SlateTransforms.unsetNodes(editor, marks, { at: path });
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
    if (selection && !SlateRange.isCollapsed(selection)) {
      // Check if the selection is contained in a single block
      if (selection.anchor.path[0] === selection.focus.path[0]) {
        // Check if the pasted text is a valid URL
        if (isUrl(pastedText)) {
          // Check if the selection only contains (rich and/or plain) text nodes
          if (!selectionContainsInlines(editor, (node) => !isText(node))) {
            // If all conditions are met, wrap the selected nodes in a custom link
            SlateTransforms.wrapNodes<ComposerBodyCustomLink>(
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
  node: SlateNode
): node is ComposerBodyCustomLink {
  return SlateElement.isElement(node) && node.type === "custom-link";
}
