import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata } from "@liveblocks/core";
import type { ComposerProps } from "@liveblocks/react-ui";
import { Composer } from "@liveblocks/react-ui";
import type { LexicalCommand } from "lexical";
import { COMMAND_PRIORITY_EDITOR, createCommand } from "lexical";
import type { ComponentRef, KeyboardEvent } from "react";
import React, { forwardRef, useEffect, useState } from "react";
import { ActiveSelection } from "../active-selection";

import { FloatingSelectionContainer } from "../floating-selection-container";

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
  const { onKeyDown, ...composerProps } = props;
  const [showComposer, setShowComposer] = useState(false);
  const [showActiveSelection, setShowActiveSelection] = useState(false);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      OPEN_FLOATING_COMPOSER_COMMAND,
      () => {
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

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      setShowComposer(false);
      editor.focus();
    }

    onKeyDown?.(event);
  }

  return (
    <>
      {showActiveSelection && <ActiveSelection />}
      <FloatingSelectionContainer
        sideOffset={5}
        alignOffset={0}
        collisionPadding={10}
      >
        <Composer
          autoFocus
          {...composerProps}
          onKeyDown={handleKeyDown}
          ref={forwardedRef}
          onFocus={() => setShowActiveSelection(true)}
        />
      </FloatingSelectionContainer>
    </>
  );
});
