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
import { $wrapSelectionInThreadMarkNode } from "./utils";
import { ShowComposerContext } from "./CommentPluginProvider";

type LexicalThreadComposerProps<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
> = Omit<
  ComposerProps<TThreadMetadata>,
  "onComposerSubmit" | "threadId" | "commentId"
>;

export function LexicalThreadComposer<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
>({ ...props }: LexicalThreadComposerProps<TThreadMetadata>) {
  const showComposer = useContext(ShowComposerContext);
  const { useCreateThread } = useRoomContextBundle();
  const createThread = useCreateThread();
  const [editor] = useLexicalComposerContext();

  if (!showComposer) return null;

  function handleComposerSubmit(comment: ComposerSubmitComment) {
    const thread = createThread({
      body: comment.body,
      metadata: props.metadata ?? {},
    });
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const isBackward = selection.isBackward();
      // Wrap content in a MarkNode
      $wrapSelectionInThreadMarkNode(selection, isBackward, thread.id);
    });
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
