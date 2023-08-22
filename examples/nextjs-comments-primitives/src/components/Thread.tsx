import { useCreateComment } from "../../liveblocks.config";
import clsx from "clsx";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import React, { ComponentProps } from "react";
import { ThreadData } from "@liveblocks/client";

/**
 * Custom thread component that displays a list of comments in the
 * thread, as well as composer for creating new comments.
 */

interface ThreadProps extends ComponentProps<"div"> {
  thread: ThreadData;
}

export function Thread({ thread, className, ...props }: ThreadProps) {
  const createComment = useCreateComment();

  return (
    <div className={clsx(className, "")} {...props}>
      <div className="-space-y-4">
        {thread.comments.map((comment) => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </div>
      <Composer
        className="border-t border-gray-200"
        placeholder="Reply to thread…"
        submit="Reply"
        onComposerSubmit={({ body }) => {
          createComment({
            threadId: thread.id,
            body,
          });
        }}
      />
    </div>
  );
}
