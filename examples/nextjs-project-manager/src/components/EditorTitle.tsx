"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import {
  ChangeEvent,
  useCallback,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  KEY_ARROW_UP_COMMAND,
} from "lexical";

export function EditorTitle() {
  const title = useStorage((root) => root.meta.title);
  const [editor] = useLexicalComposerContext();

  // Update title
  const handleChange = useMutation(
    ({ storage }, e: ChangeEvent<HTMLInputElement>) => {
      storage.get("meta").set("title", e.target.value);
    },
    []
  );

  // Go to editor when down arrow pressed
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      setTimeout(() => editor._rootElement?.focus());
    }
  }, []);

  // Go to input when up arrow pressed in first position of editor
  const inputRef = useRef<HTMLInputElement | null>(null);
  useUpArrowAtTopListener(() => {
    inputRef.current?.focus();
  });

  return (
    <input
      ref={inputRef}
      type="text"
      value={title}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="outline-none block w-full text-2xl font-bold bg-transparent"
    />
  );
}

function useUpArrowAtTopListener(callback: () => void) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event: KeyboardEvent) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          const topElement = selection.anchor
            .getNode()
            .getTopLevelElementOrThrow();
          const firstChild = topElement.getParentOrThrow().getFirstChild();

          // Check if the anchor node is the first child and at the start
          if (topElement.is(firstChild) && selection.anchor.offset === 0) {
            callback();
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor]);
}
