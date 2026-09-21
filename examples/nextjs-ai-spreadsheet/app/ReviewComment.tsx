"use client";

import { useCallback, useMemo, useState } from "react";
import { Comment, type CommentProps } from "@liveblocks/react-ui";
import {
  useCreateComment,
  useEditCommentMetadata,
  useMarkThreadAsResolved,
  useRoom,
} from "@liveblocks/react/suspense";
import type { CommentBody } from "@liveblocks/client";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_USER_ID } from "@/database";
import { describeFix, parseFix } from "@/lib/fix";
import { useCellThread } from "./CellThreadContext";

// Plain-text body of the comment "Fix it" posts when the review has no saved
// fix. Jev classifies it as `approve_fix` (see lib/jev-review.ts) and the AI
// works out and applies the change — no @mention needed. Typing "yes, go
// ahead" by hand works the same.
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
  const room = useRoom();
  const createComment = useCreateComment();
  const editCommentMetadata = useEditCommentMetadata();
  const markThreadAsResolved = useMarkThreadAsResolved();
  const { setOpenCell } = useCellThread();
  const [busy, setBusy] = useState(false);

  const isPendingReview =
    comment.userId === AI_USER_ID &&
    comment.metadata?.review === "pending" &&
    !comment.deletedAt;

  // The reviewer saved its edits with the comment (see lib/fix.ts), so the
  // button can apply them instantly rather than asking the AI again.
  const savedFix = useMemo(
    () => parseFix(comment.metadata?.fix),
    [comment.metadata?.fix]
  );

  const fixIt = useCallback(() => {
    setBusy(true);
    // The user is done with this thread: close it and let the fix land in the
    // grid. (The server also resolves the thread once the fix is applied.)
    setOpenCell(null);
    // Hide the buttons for everyone right away; the server sets the
    // authoritative metadata once the fix is applied.
    editCommentMetadata({
      threadId: comment.threadId,
      commentId: comment.id,
      metadata: { review: "accepted" },
    });
    if (savedFix) {
      // Apply the saved fix server-side with `mutateStorage`. The server
      // confirms in the thread and resolves it.
      fetch("/api/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          threadId: comment.threadId,
          commentId: comment.id,
        }),
      })
        .then(async (response) => {
          const { applied } = response.ok
            ? ((await response.json()) as { applied?: boolean })
            : { applied: false };
          if (!applied) {
            // The fix was gone (already applied, or dropped) — ask the AI.
            createComment({ threadId: comment.threadId, body: FIX_IT_BODY });
          }
        })
        .catch(() => {
          createComment({ threadId: comment.threadId, body: FIX_IT_BODY });
        });
      return;
    }
    // No saved fix: ask the AI in the thread.
    createComment({ threadId: comment.threadId, body: FIX_IT_BODY });
  }, [
    comment.id,
    comment.threadId,
    createComment,
    editCommentMetadata,
    room.id,
    savedFix,
    setOpenCell,
  ]);

  const ignore = useCallback(() => {
    setBusy(true);
    editCommentMetadata({
      threadId: comment.threadId,
      commentId: comment.id,
      metadata: { review: "ignored", fix: null },
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
            <Button
              size="xs"
              onClick={fixIt}
              disabled={busy}
              title={savedFix ? describeFix(savedFix) : undefined}
            >
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
