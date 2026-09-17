"use client";

import { useCallback, useState } from "react";
import { Comment, type CommentProps } from "@liveblocks/react-ui";
import {
  useCreateComment,
  useEditCommentMetadata,
  useMarkThreadAsResolved,
} from "@liveblocks/react/suspense";
import type { CommentBody } from "@liveblocks/client";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_USER_ID } from "@/database";

// Plain-text body of the comment the "Fix it" button posts. Jev classifies it
// as `approve_fix` (see lib/jev-review.ts) and the AI applies the recommended
// change — no @mention needed. Typing "yes, go ahead" by hand works the same.
const FIX_IT_BODY: CommentBody = {
  version: 1,
  content: [{ type: "paragraph", children: [{ text: "Fix it" }] }],
};

/**
 * The default `Comment`, plus "Fix it" / "Ignore" under the reviewer's pending
 * recommendations. Plugged into the thread via `components={{ Comment }}` in
 * CommentOverlay.tsx.
 */
export function ReviewComment(props: CommentProps) {
  const { comment } = props;
  const createComment = useCreateComment();
  const editCommentMetadata = useEditCommentMetadata();
  const markThreadAsResolved = useMarkThreadAsResolved();
  const [busy, setBusy] = useState(false);

  const isPendingReview =
    comment.userId === AI_USER_ID &&
    comment.metadata?.review === "pending" &&
    !comment.deletedAt;

  const fixIt = useCallback(() => {
    setBusy(true);
    // Hide the buttons for everyone, then ask for the fix. The server flips the
    // metadata too once the fix is applied, so this is just the optimistic step.
    editCommentMetadata({
      threadId: comment.threadId,
      commentId: comment.id,
      metadata: { review: "accepted" },
    });
    createComment({ threadId: comment.threadId, body: FIX_IT_BODY });
  }, [comment.id, comment.threadId, createComment, editCommentMetadata]);

  const ignore = useCallback(() => {
    setBusy(true);
    editCommentMetadata({
      threadId: comment.threadId,
      commentId: comment.id,
      metadata: { review: "ignored" },
    });
    // Resolved threads are hidden from the grid (see CellThreadContext).
    markThreadAsResolved(comment.threadId);
  }, [comment.id, comment.threadId, editCommentMetadata, markThreadAsResolved]);

  return (
    <Comment
      {...props}
      additionalContent={
        isPendingReview ? (
          <div className="mt-2 flex gap-2">
            <Button size="xs" onClick={fixIt} disabled={busy}>
              <Check />
              Fix it
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={ignore}
              disabled={busy}
            >
              <X />
              Ignore
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
