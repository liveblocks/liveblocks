import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { RangeSelection } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";
import { useCallback } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

export function useSelection(): RangeSelection | null {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerUpdateListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return null;

      return selection;
    });
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
