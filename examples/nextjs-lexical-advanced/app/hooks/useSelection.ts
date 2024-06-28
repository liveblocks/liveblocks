import { useCallback, useEffect, useState } from "react";
import { $getSelection, $setSelection, BaseSelection } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

// Returns the current selection state, textContent, and a function to remove the selection
export function useSelection() {
  const [editor] = useLexicalComposerContext();
  const [selection, setSelection] = useState<BaseSelection | null>(null);
  const [textContent, setTextContent] = useState<string | null>();

  useEffect(() => {
    // Subscribe to selection changes
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const currentSelection = $getSelection();
        setSelection(currentSelection);
        setTextContent(currentSelection?.getTextContent());
      });
    });

    // Clean up the listener when the component unmounts
    return () => {
      removeListener();
    };
  }, [editor]);

  // Removes a selection
  const removeSelection = useCallback(() => {
    editor.update(() => $setSelection(null));
  }, [editor]);

  return { selection, textContent, removeSelection };
}
