import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata } from "@liveblocks/core";
import { useCreateThread } from "@liveblocks/react";
import type {
  ComposerProps,
  ComposerSubmitComment,
} from "@liveblocks/react-ui";
import { Composer } from "@liveblocks/react-ui";
import type { LexicalCommand } from "lexical";
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from "lexical";
import type { ComponentRef, FormEvent, KeyboardEvent } from "react";
import React, { forwardRef, useCallback, useEffect, useState } from "react";

import { ActiveSelection } from "../active-selection";
import { FloatingSelectionContainer } from "../floating-selection-container";
import $wrapSelectionInThreadMarkNode from "./wrap-selection-in-thread-mark-node";

export const OPEN_FLOATING_COMPOSER_COMMAND: LexicalCommand<void> =
  createCommand("OPEN_FLOATING_COMPOSER_COMMAND");

type ComposerElement = ComponentRef<typeof Composer>;

type ThreadMetadata = {
  resolved?: boolean;
};

type FloatingComposerProps<M extends BaseMetadata = ThreadMetadata> = Omit<
  ComposerProps<M>,
  "threadId" | "commentId"
>;

export const FloatingComposer = forwardRef<
  ComposerElement,
  FloatingComposerProps
>(function FloatingComposer(props, forwardedRef) {
  const { onKeyDown, onComposerSubmit, ...composerProps } = props;
  const [showComposer, setShowComposer] = useState(false);
  const [showActiveSelection, setShowActiveSelection] = useState(false);
  const [editor] = useLexicalComposerContext();
  const createThread = useCreateThread();

  /**
   * Create a new ThreadMarkNode and wrap the selected content in it.
   * @param threadId The id of the thread to associate with the selected content
   */
  const onThreadCreate = useCallback(
    (threadId: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        // If the selection is collapsed, we do not create a new thread node in the editor.
        if (selection.isCollapsed()) return;

        const isBackward = selection.isBackward();
        // Wrap content in a ThreadMarkNode
        $wrapSelectionInThreadMarkNode(selection, isBackward, threadId);

        // Clear the selection after wrapping
        $setSelection(null);
      });
    },
    [editor]
  );

  const handleComposerSubmit = useCallback(
    (comment: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      onComposerSubmit?.(comment, event);
      if (event.defaultPrevented) return;

      event.preventDefault();

      const thread = createThread({
        body: comment.body,
        metadata: props.metadata ?? {},
      });

      onThreadCreate(thread.id);
    },
    [onThreadCreate, onComposerSubmit, props.metadata, createThread]
  );

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      setShowComposer(false);
      editor.focus();
    }

    onKeyDown?.(event);
  }

  useEffect(() => {
    return editor.registerCommand(
      OPEN_FLOATING_COMPOSER_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        if (selection.isCollapsed()) return false;

        setShowComposer(true);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  useEffect(() => {
    if (!showComposer) return;

    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // Ignore selection updates related to collaboration
      if (tags.has("collaboration")) return;
      state.read(() => setShowComposer(false));
    });
  }, [editor, showComposer]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // Ignore selection updates related to collaboration
      if (tags.has("collaboration")) return;
      state.read(() => setShowActiveSelection(false));
    });
  }, [editor]);

  if (!showComposer) return null;

  return (
    <>
      {showActiveSelection && <ActiveSelection />}
      <FloatingSelectionContainer
        sideOffset={5}
        alignOffset={0}
        collisionPadding={15}
      >
        <Composer
          autoFocus
          {...composerProps}
          onKeyDown={handleKeyDown}
          onComposerSubmit={handleComposerSubmit}
          ref={forwardedRef}
          onFocus={() => setShowActiveSelection(true)}
        />
      </FloatingSelectionContainer>
    </>
  );
});
