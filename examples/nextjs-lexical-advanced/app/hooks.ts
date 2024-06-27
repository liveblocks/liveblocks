import { useEffect, useState } from "react";
import { $getSelection, BaseSelection } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

// This hook returns the current selection state from the Lexical editor
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

  return { selection, textContent };
}

// This hook returns the current selection state from the Lexical editor
export function usePreviousSelection() {
  const [editor] = useLexicalComposerContext();
  const [selection, setSelection] = useState<BaseSelection | null>(null);

  useEffect(() => {
    // Subscribe to selection changes
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const currentSelection = $getSelection();
        if (currentSelection) {
          setSelection(currentSelection);
        }
      });
    });

    // Clean up the listener when the component unmounts
    return () => {
      removeListener();
    };
  }, [editor]);

  return selection;
}
