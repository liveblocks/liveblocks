import {
  useCreateComment,
  useEditThreadMetadata,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { Comment } from "./Comment";
import { Composer } from "./Composer";
import React, { ComponentProps, Suspense, useCallback } from "react";
import { ThreadData } from "@liveblocks/client";
import { Toggle, Select } from "radix-ui";
import { Button } from "./Button";
import { Timestamp } from "@liveblocks/react-ui/primitives";
import { Icon } from "@liveblocks/react-ui";
import { User } from "./User";
import useSWR from "swr";
import { Avatar } from "./Avatar";

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
        <div className="ml-auto flex items-center gap-2">
          <Suspense>
            <ThreadAssignee thread={thread} />
          </Suspense>
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

const NO_ASSIGNEE = "__NO_ASSIGNEE__";

interface ThreadAssigneeProps extends ComponentProps<"button"> {
  thread: ThreadData;
}

function useUserIds() {
  const { data: userIds } = useSWR<string[]>(
    "/api/users/search",
    (url: string) => fetch(url).then((res) => res.json()),
    { suspense: true }
  );

  return userIds ?? [];
}

function ThreadAssignee({ thread, className, ...props }: ThreadAssigneeProps) {
  const editThreadMetadata = useEditThreadMetadata();
  const assignee = thread.metadata.assignee ?? NO_ASSIGNEE;
  const userIds = useUserIds();

  const handleAssigneeChange = useCallback(
    (assignee: string) => {
      editThreadMetadata({
        threadId: thread.id,
        metadata: {
          assignee: assignee === NO_ASSIGNEE ? null : assignee,
        },
      });
    },
    [editThreadMetadata, thread.id]
  );

  return (
    <Select.Root value={assignee} onValueChange={handleAssigneeChange}>
      <Select.Trigger asChild>
        <Button
          variant="secondary"
          className={clsx(className, "relative")}
          {...props}
        >
          <Icon.User className="-ml-1 mr-1 h-5 w-5" />
          <Select.Value>
            {thread.metadata.assignee ? (
              <Suspense fallback="Assignee">
                <User userId={thread.metadata.assignee} />
              </Suspense>
            ) : (
              <>No assignee</>
            )}
          </Select.Value>
          <Icon.ChevronDown className="-mr-1 ml-1 h-5 w-5" />
        </Button>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="rounded-lg bg-white p-1 shadow-xl">
          <Select.Viewport>
            <Select.Item
              value={NO_ASSIGNEE}
              className="outline-hidden data-highlighted:bg-gray-100 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <Icon.User className="h-5 w-5 text-gray-500" />
              <Select.ItemText>No assignee</Select.ItemText>
              <div className="ml-auto h-5 w-5">
                <Select.ItemIndicator>
                  <Icon.Check className="h-5 w-5" />
                </Select.ItemIndicator>
              </div>
            </Select.Item>
            {userIds.map((userId) => (
              <Select.Item
                key={userId}
                value={userId}
                className="outline-hidden data-highlighted:bg-gray-100 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm"
              >
                <Suspense
                  fallback={
                    <div className="relative aspect-square w-5 flex-none animate-pulse rounded-full bg-gray-100" />
                  }
                >
                  <Avatar userId={userId} className="w-5 flex-none" />
                </Suspense>
                <Suspense fallback={userId}>
                  <User userId={userId} />
                </Suspense>
                <div className="ml-auto h-5 w-5">
                  <Select.ItemIndicator>
                    <Icon.Check className="h-5 w-5" />
                  </Select.ItemIndicator>
                </div>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
