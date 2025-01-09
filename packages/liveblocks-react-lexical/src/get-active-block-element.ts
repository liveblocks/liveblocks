import { $findMatchingParent } from "@lexical/utils";
import type { LexicalEditor } from "lexical";
import { $getSelection, $isRangeSelection, $isRootOrShadowRoot } from "lexical";

export function getActiveBlockElement(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) return null;

    // TODO: Improve performance by returning null if the selection is across multiple blocks?

    const anchor = selection.anchor.getNode();
    let element =
      anchor.getKey() === "root"
        ? anchor
        : $findMatchingParent(anchor, (node) => {
            const parent = node.getParent();
            return parent !== null && $isRootOrShadowRoot(parent);
          });

    if (element === null) {
      element = anchor.getTopLevelElementOrThrow();
    }

    return element;
  });
}
