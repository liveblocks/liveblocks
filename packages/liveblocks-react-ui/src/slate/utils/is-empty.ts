import type { Descendant } from "slate";
import { Editor as SlateEditor, Text as SlateText } from "slate";

import { isEmptyString } from "./is-empty-string";

export function isEmpty(editor: SlateEditor, children: Descendant[]) {
  // No children
  if (children.length === 0) {
    return true;
  }

  // Check if all blocks are empty, stopping at the first non-empty block
  for (const child of children) {
    if (SlateText.isText(child)) {
      // Non-empty text
      if (!isEmptyString(child.text)) {
        return false;
      }
    } else if (child.type === "paragraph") {
      // Non-empty paragraph
      if (
        child.children.length > 1 ||
        !(
          SlateText.isText(child.children[0]) &&
          isEmptyString(child.children[0].text)
        )
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
