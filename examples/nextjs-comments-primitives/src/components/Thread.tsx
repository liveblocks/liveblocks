import {
  useCreateComment,
  useEditThreadMetadata,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import React, { ComponentProps, useCallback } from "react";
import { ThreadData } from "@liveblocks/client";
import { Toggle, Select } from "radix-ui";
import { Button } from "./Button";
import { Timestamp } from "@liveblocks/react-ui/primitives";
import { Icon } from "@liveblocks/react-ui";

interface ThreadProps extends ComponentProps<"div"> {
  thread: ThreadData;
}

/**
 * Custom thread component that displays a list of comments in the
 * thread, as well as a composer for creating new comments.
 */
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
      <div className="flex items-center gap-4 border-b border-gray-200 p-4">
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
        <ThreadPriority thread={thread} className="ml-auto" />
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
            metadata: { userAgent: navigator.userAgent },
          });
        }}
      />
    </div>
  );
}

const PRIORITIES = {
  "0": "No priority",
  "1": "Low",
  "2": "Medium",
  "3": "High",
};
const DEFAULT_PRIORITY = "0";

interface ThreadPriorityProps extends ComponentProps<"button"> {
  thread: ThreadData;
}

function ThreadPriority({ thread, className, ...props }: ThreadPriorityProps) {
  const editThreadMetadata = useEditThreadMetadata();
  const priority = thread.metadata.priority?.toString() ?? DEFAULT_PRIORITY;

  const handlePriorityChange = useCallback(
    (priority: string) => {
      editThreadMetadata({
        threadId: thread.id,
        metadata: {
          priority: priority === DEFAULT_PRIORITY ? null : Number(priority),
        },
      });
    },
    [editThreadMetadata, thread.id]
  );

  return (
    <Select.Root value={priority} onValueChange={handlePriorityChange}>
      <Select.Trigger asChild>
        <Button
          variant="secondary"
          className={clsx(className, "relative")}
          {...props}
        >
          <Select.Value>
            {PRIORITIES[priority as keyof typeof PRIORITIES]}
          </Select.Value>
          <Icon.ChevronDown className="-mr-1 ml-1 h-5 w-5" />
        </Button>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="rounded-lg bg-white p-1 shadow-xl">
          <Select.Viewport>
            {Object.entries(PRIORITIES).map(([value, label]) => (
              <Select.Item
                key={value}
                value={value}
                className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-hidden data-highlighted:bg-gray-100"
              >
                <div className="h-5 w-5">
                  <Select.ItemIndicator>
                    <Icon.Check className="h-5 w-5" />
                  </Select.ItemIndicator>
                </div>
                <Select.ItemText>{label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
