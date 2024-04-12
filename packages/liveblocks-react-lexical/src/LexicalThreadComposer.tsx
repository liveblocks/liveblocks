import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata } from "@liveblocks/core";
import { useRoomContextBundle } from "@liveblocks/react";
import { Composer, type ComposerProps, type ComposerSubmitComment } from "@liveblocks/react-comments";
import { $getSelection, $isRangeSelection } from "lexical";
import React from "react";

import { useLastActiveSelection } from "./CommentPluginProvider";
import type { ThreadMetadata } from "./types";
import { $wrapSelectionInThreadMarkNode } from "./utils";

type LexicalThreadComposerProps<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
> = Omit<
  ComposerProps<TThreadMetadata>,
  "onComposerSubmit" | "threadId" | "commentId"
>;

export function LexicalThreadComposer<
  TThreadMetadata extends BaseMetadata = ThreadMetadata,
>({ metadata, ...props }: LexicalThreadComposerProps<TThreadMetadata>) {
  const lastActiveSelection = useLastActiveSelection();
  const { useCreateThread } = useRoomContextBundle();
  const createThread = useCreateThread();
  const [editor] = useLexicalComposerContext();

  if (lastActiveSelection === null) return null;

  function handleComposerSubmit(comment: ComposerSubmitComment) {
    const thread = createThread({
      body: comment.body,
      metadata: metadata ?? {},
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