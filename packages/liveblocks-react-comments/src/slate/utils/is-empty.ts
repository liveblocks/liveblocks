import type { Descendant } from "slate";
import { Editor as SlateEditor, Text as SlateText } from "slate";

export function isEmpty(editor: SlateEditor, children: Descendant[]) {
  return (
    children.length <= 1 &&
    !SlateText.isText(children[0]) &&
    SlateEditor.isEmpty(editor, children[0])
  );
}
