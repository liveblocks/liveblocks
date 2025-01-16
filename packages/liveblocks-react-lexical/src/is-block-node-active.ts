import { $findMatchingParent } from "@lexical/utils";
import type { EditorState, LexicalEditor, LexicalNode } from "lexical";
import { $getSelection, $isRangeSelection, $isRootOrShadowRoot } from "lexical";

function isParentRootOrShadowRoot(node: LexicalNode) {
  const parent = node.getParent();

  return parent !== null && $isRootOrShadowRoot(parent);
}

const activeNodesByEditor = new Map<
  string,
  {
    state: EditorState;
    nodes: LexicalNode[];
  }
>();

function getActiveBlockNodes(editor: LexicalEditor) {
  const editorKey = editor.getKey();
  const currentState = editor.getEditorState();

  return currentState.read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      activeNodesByEditor.delete(editorKey);

      return [];
    }

    const cache = activeNodesByEditor.get(editorKey);

    if (cache?.state === currentState) {
      return cache.nodes;
    }

    const anchor = selection.anchor.getNode();
    const focus = selection.focus.getNode();
    const commonAncestor = anchor.getCommonAncestor(focus);

    let activeNodes: LexicalNode[] = [];

    if (commonAncestor && !$isRootOrShadowRoot(commonAncestor)) {
      const activeNode = isParentRootOrShadowRoot(commonAncestor)
        ? commonAncestor
        : $findMatchingParent(commonAncestor, isParentRootOrShadowRoot);

      if (activeNode) {
        activeNodes = [activeNode];
      }
    } else {
      activeNodes = selection
        .getNodes()
        .filter((node) => $isRootOrShadowRoot(node.getParent()));
    }

    activeNodesByEditor.set(editorKey, {
      state: currentState,
      nodes: activeNodes,
    });

    return activeNodes;
  });
}

export function isBlockNodeActive(
  editor: LexicalEditor,
  isActive: (node: LexicalNode) => boolean
): boolean {
  const activeNodes = getActiveBlockNodes(editor);

  if (activeNodes.length === 0) {
    return false;
  }

  return activeNodes.every(isActive);
}
