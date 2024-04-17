import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalCommand, LexicalNode } from "lexical";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from "lexical";
import React, { createContext, useEffect, useState } from "react";

export const INSERT_THREAD_COMMAND: LexicalCommand<void> = createCommand(
  "INSERT_THREAD_COMMAND"
);

type SelectionInfo = {
  anchor: {
    node: LexicalNode;
    offset: number;
  };
  focus: {
    node: LexicalNode;
    offset: number;
  };
};

export const LastActiveSelectionContext = createContext<
  SelectionInfo | undefined
>(undefined);

export function CommentPluginProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [editor] = useLexicalComposerContext();

  const [lastActiveSelection, setLastActiveSelection] =
    useState<SelectionInfo>(); // The last active selection that was used to attach a thread

  /**
   * Register a command that can be used to insert a comment at the current selection.
   */
  useEffect(() => {
    return editor.registerCommand(
      INSERT_THREAD_COMMAND,
      (type?: string) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        // If we got an empty selection (just a caret), try and expand it
        if (selection?.getTextContent().trim() === "") {
          if (type === "expansion") {
            // Do NOT try to expand again if this came from an expansion
            return false;
          }

          // Update selection to find nearest word
          editor.update(
            () => {
              selection.modify("move", true, "word"); // move to the beginning of the previous word
              selection.modify("extend", false, "word"); // extend back to the whole word
            },
            {
              tag: "expansion", // Tag the update so we can find it in handlers
              onUpdate: () => {
                // After expansion, run the insert comment command again (the original one did NOT complete)
                editor.dispatchCommand<LexicalCommand<"expansion">>(
                  INSERT_THREAD_COMMAND,
                  "expansion"
                );
              },
            }
          );
          return false;
        }

        const nativeSelection = window.getSelection();
        if (nativeSelection !== null) {
          nativeSelection.removeAllRanges();
        }

        const activeSelection = {
          anchor: {
            node: selection.anchor.getNode() as LexicalNode,
            offset: selection.anchor.offset,
          },
          focus: {
            node: selection.focus.getNode() as LexicalNode,
            offset: selection.focus.offset,
          },
        };

        setLastActiveSelection(activeSelection);

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, setLastActiveSelection]);

  useEffect(() => {
    function onStateRead() {
      setLastActiveSelection(undefined);
    }
    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // Ignore selection expansion updates (from insert comments on a caret) and collab updates
      if (tags.has("collaboration") || tags.has("expansion")) {
        return;
      }
      state.read(onStateRead);
    });
  }, [editor, setLastActiveSelection]);

  return (
    <LastActiveSelectionContext.Provider value={lastActiveSelection}>
      {children}
    </LastActiveSelectionContext.Provider>
  );
}
