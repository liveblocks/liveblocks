import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { NodeKey } from "lexical";
import { $createNodeSelection, $getNodeByKey, $setSelection } from "lexical";
import type { HTMLAttributes, ReactNode } from "react";
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
} from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

const IsSelectedContext = createContext<boolean | null>(null);

export function MentionWrapper({
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
    <IsSelectedContext.Provider value={isSelected}>
      <span onClick={handleClick}>{children}</span>
    </IsSelectedContext.Provider>
  );
}

export const Mention = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(function (props, forwardedRef) {
  const isSelected = useContext(IsSelectedContext);
  if (isSelected === null) {
    throw new Error("Mention component must be wrapped in MentionWrapper");
  }

  return (
    <span
      data-selected={isSelected ? "" : undefined}
      {...props}
      ref={forwardedRef}
    >
      {props.children}
    </span>
  );
});

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
