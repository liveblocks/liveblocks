import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { NodeKey } from "lexical";
import { $createNodeSelection, $getNodeByKey, $setSelection } from "lexical";
import type { ReactNode } from "react";
import React, { useCallback } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

export function Mention({
  nodeKey,
  children,
}: {
  nodeKey: NodeKey;
  children: ReactNode;
}) {
  const [editor] = useLexicalComposerContext();
  const isSelected = useIsNodeSelected(nodeKey);

  function handleClick(event: React.MouseEvent) {
    editor.update(() => {
      event.stopPropagation();
      event.preventDefault();

      const selection = $createNodeSelection();
      selection.add(nodeKey);
      $setSelection(selection);
    });
  }

  return (
    <span
      onClick={handleClick}
      data-selected={isSelected ? "" : undefined}
      className="lb-root lb-lexical-mention"
    >
      {children}
    </span>
  );
}

function $isNodeSelected(key: NodeKey): boolean {
  const node = $getNodeByKey(key);
  if (node === null) return false;
  return node.isSelected();
}

function useIsNodeSelected(key: NodeKey) {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerUpdateListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => $isNodeSelected(key));
  }, [editor, key]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
