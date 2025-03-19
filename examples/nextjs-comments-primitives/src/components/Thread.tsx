import {
  useCreateComment,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import React, { ComponentProps, useCallback } from "react";
import { ThreadData } from "@liveblocks/client";
import * as Toggle from "@radix-ui/react-toggle";
import { Button } from "./Button";
import { Timestamp } from "@liveblocks/react-ui/primitives";

/**
 * Custom thread component that displays a list of comments in the
 * thread, as well as a composer for creating new comments, and can
 * be marked as resolved.
 */

interface ThreadProps extends ComponentProps<"div"> {
  thread: ThreadData;
}

export function Thread({ thread, className, ...props }: ThreadProps) {
  const createComment = useCreateComment();
  const markThreadAsResolved = useMarkThreadAsResolved();
  const markThreadAsUnresolved = useMarkThreadAsUnresolved();

  const handleResolvedChange = useCallback(
    (resolved: boolean) => {
      if (resolved) {
        markThreadAsResolved(thread.id);
      } else {
        markThreadAsUnresolved(thread.id);
      }
    },
    [markThreadAsResolved, markThreadAsUnresolved, thread.id]
  );

  return (
    <div
      className={clsx(
        className,
        "relative",
        thread.resolved && "opacity-60 grayscale"
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 p-4">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-semibold">
            {thread.comments.length} comment
            {thread.comments.length > 1 ? "s" : ""}
          </span>
          <Timestamp
            date={thread.createdAt}
            className="truncate text-sm text-gray-500"
          />
        </div>
        <Toggle.Root
          pressed={thread.resolved}
          onPressedChange={handleResolvedChange}
          asChild
        >
          <Button variant={thread.resolved ? "secondary" : "primary"}>
            {thread.resolved ? "Mark as unresolved" : "Mark as resolved"}
          </Button>
        </Toggle.Root>
      </div>
      <div className="-space-y-4">
        {thread.comments.map((comment) => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </div>
      <Composer
        className="border-t border-gray-200"
        placeholder="Reply to thread…"
        submit="Reply"
        onComposerSubmit={({ body, attachments }) => {
          createComment({
            threadId: thread.id,
            body,
            attachments,
          });
        }}
      />
    </div>
  );
}
