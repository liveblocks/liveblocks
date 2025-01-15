import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useSyncExternalStore } from "react";

export function useRootElement(): HTMLElement | null {
  const [editor] = useLexicalComposerContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerRootListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getRootElement();
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
