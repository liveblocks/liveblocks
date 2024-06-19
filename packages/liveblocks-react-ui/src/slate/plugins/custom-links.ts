import type { Editor, Node } from "slate";
import { Element, Range, Transforms } from "slate";

import type { ComposerBodyCustomLink } from "../../types";
import { isPlainText, isText } from "../utils/is-text";
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
  const { isInline, insertData } = editor;

  editor.isInline = (element) => {
    return element.type === "custom-link" ? true : isInline(element);
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
        // Check if the selection only contains (rich and/or plain) text nodes
        if (!selectionContainsInlines(editor, (node) => !isText(node))) {
          // Finally, check if the pasted text is a valid URL
          if (isUrl(pastedText)) {
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
