import type { Descendant } from "slate";
import { Editor as SlateEditor } from "slate";

import { isEmptyString } from "./is-empty-string";
import { isText } from "./is-text";

export function isEmpty(editor: SlateEditor, children: Descendant[]) {
  // Check if all blocks are empty, stopping at the first non-empty block
  for (const child of children) {
    if (isText(child)) {
      // Non-empty text
      if (!isEmptyString(child.text)) {
        return false;
      }
    } else if (child.type === "paragraph") {
      // Non-empty paragraph
      if (
        child.children.length > 1 ||
        (child.children[0] &&
          !(isText(child.children[0]) && isEmptyString(child.children[0].text)))
      ) {
        return false;
      }
    } else {
      // Non-empty other block
      if (!SlateEditor.isEmpty(editor, child)) {
        return false;
      }
    }
  }

  return true;
}
