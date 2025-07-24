import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { cn } from "@liveblocks/react-ui/_private";
import type { NodeKey } from "lexical";
import { $createNodeSelection, $getNodeByKey, $setSelection } from "lexical";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type MouseEvent,
} from "react";
import { useCallback, useSyncExternalStore } from "react";

interface MentionProps extends ComponentPropsWithoutRef<"span"> {
  nodeKey: NodeKey;
}

export const Mention = forwardRef<HTMLSpanElement, MentionProps>(
  ({ nodeKey, children, className, ...props }, forwardedRef) => {
    const [editor] = useLexicalComposerContext();
    const isSelected = useIsNodeSelected(nodeKey);

    const handleClick = useCallback(
      (event: MouseEvent) => {
        editor.update(() => {
          event.stopPropagation();
          event.preventDefault();

          const selection = $createNodeSelection();
          selection.add(nodeKey);
          $setSelection(selection);
        });
      },
      [editor, nodeKey]
    );

    return (
      <span
        onClick={handleClick}
        data-selected={isSelected ? "" : undefined}
        className={cn("lb-root lb-lexical-mention", className)}
        ref={forwardedRef}
        {...props}
      >
        {children}
      </span>
    );
  }
);

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
