import { $findMatchingParent } from "@lexical/utils";
import type { LexicalEditor, LexicalNode } from "lexical";
import { $getSelection, $isRangeSelection, $isRootOrShadowRoot } from "lexical";

function isParentRootOrShadowRoot(node: LexicalNode) {
  const parent = node.getParent();

  return parent !== null && $isRootOrShadowRoot(parent);
}

export function getSelectedBlockElement(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) return null;

    const anchor = selection.anchor.getNode();
    const focus = selection.focus.getNode();

    const commonAncestor = anchor.getCommonAncestor(focus);

    if (!commonAncestor || $isRootOrShadowRoot(commonAncestor)) return null;

    const element = isParentRootOrShadowRoot(commonAncestor)
      ? commonAncestor
      : $findMatchingParent(commonAncestor, isParentRootOrShadowRoot);

    return element;
  });
}
