"use client";

import { useState } from "react";
import { Composer, Comment, Thread } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/client";

/**
 * Custom thread component that shows a limited number of comments initially
 * and provides a "view x more replies" button when there are many comments.
 */
export function CollapsibleThread({
  thread,
  className,
  initialVisibleComments = 3,
}: {
  thread: ThreadData;
  className?: string;
  initialVisibleComments?: number;
}) {
  const [showAllComments, setShowAllComments] = useState(false);

  const visibleComments = showAllComments
    ? thread.comments
    : thread.comments.slice(0, initialVisibleComments);

  const hiddenCommentsCount = thread.comments.length - initialVisibleComments;
  const hasHiddenComments = hiddenCommentsCount > 0 && !showAllComments;

  return (
    <Thread className={className} thread={thread}>
      {visibleComments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}

      {hasHiddenComments && (
        <button onClick={() => setShowAllComments(true)}>
          View {hiddenCommentsCount} more repl
          {hiddenCommentsCount === 1 ? "y" : "ies"}
        </button>
      )}

      <Composer className="composer" threadId={thread.id} />
    </Thread>
  );
}
