import { useCallback, useEffect, useState } from "react";
import { $getSelection, $setSelection, BaseSelection } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

// Returns the current selection state, textContent, and a function to remove the selection
export function useSelection() {
  const [editor] = useLexicalComposerContext();
  const [selection, setSelection] = useState<BaseSelection | null>(null);
  const [textContent, setTextContent] = useState<string | null>();

  useEffect(() => {
    // Set initial state
    editor.update(() => {
      const currentSelection = $getSelection();
      setSelection(currentSelection);
      setTextContent(currentSelection?.getTextContent());
    });

    // Subscribe to selection changes and clean up
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const currentSelection = $getSelection();
        setSelection(currentSelection);
        setTextContent(currentSelection?.getTextContent());
      });
    });
  }, [editor]);

  // Removes a selection
  const removeSelection = useCallback(() => {
    editor.update(() => $setSelection(null));
  }, [editor]);

  return { selection, textContent, removeSelection };
}
