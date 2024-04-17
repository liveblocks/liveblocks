import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import {
  Composer,
  type ComposerProps,
  type ComposerSubmitComment,
} from "@liveblocks/react-comments";
import { $getSelection, $isRangeSelection } from "lexical";
import React, { useContext } from "react";

import type { ThreadMetadata } from "./types";
import { LastActiveSelectionContext } from "./CommentPluginProvider";
import { createRelativePosition, useBinding } from "./CollaborationPlugin";

type LexicalThreadComposerProps<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
> = Omit<
  ComposerProps<TThreadMetadata>,
  "onComposerSubmit" | "threadId" | "commentId"
>;

export function LexicalThreadComposer<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
>({ ...props }: LexicalThreadComposerProps<TThreadMetadata>) {
  const lastActiveSelection = useContext(LastActiveSelectionContext);
  const { useCreateThread } = useRoomContextBundle();
  const createThread = useCreateThread();
  const [editor] = useLexicalComposerContext();
  const binding = useBinding();

  if (lastActiveSelection === undefined) return null;

  function handleComposerSubmit(comment: ComposerSubmitComment) {
    function onStateRead() {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchorPosition = createRelativePosition(selection.anchor, binding);
      const focusPosition = createRelativePosition(selection.focus, binding);

      createThread({
        body: comment.body,
        metadata: {
          anchor: JSON.stringify(anchorPosition),
          focus: JSON.stringify(focusPosition),
        },
      });
    }

    editor.getEditorState().read(onStateRead);
  }

  return (
    <Composer
      onComposerSubmit={(content, event) => {
        event.preventDefault();
        handleComposerSubmit(content);
      }}
      {...props}
    />
  );
}
