"use client";

import {
  useInboxNotifications,
  ClientSideSuspense,
  useUser,
  useMarkAllInboxNotificationsAsRead,
  useDeleteAllInboxNotifications,
  useMarkInboxNotificationAsRead,
} from "@liveblocks/react/suspense";
import { InboxNotificationList } from "@liveblocks/react-ui";
import { Comment } from "@liveblocks/react-ui/primitives";
import { ErrorBoundary } from "react-error-boundary";
import { InboxNotificationData } from "@liveblocks/core";
import { Avatar } from "@/components/Avatar";
import classNames from "classnames";
import { useRoomInfo, useInboxNotificationThread } from "@liveblocks/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { Mention } from "@/components/Mention";
import { Link } from "@/components/Link";
import { CheckCheckIcon } from "@/icons/CheckCheckIcon";
import { useMemo } from "react";
import { RubbishIcon } from "@/icons/RubbishIcon";
import { useInbox } from "@/components/InboxContext";

export function Inbox() {
  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <div className="flex items-center justify-between px-4 text-sm border-b h-10">
        <div>Inbox</div>
        <div className="flex gap-2">
          <InboxActionButtons />
        </div>
      </div>
      <ClientSideSuspense fallback={null}>
        <InboxNotifications />
      </ClientSideSuspense>
    </ErrorBoundary>
  );
}

function InboxActionButtons() {
  const deleteAll = useDeleteAllInboxNotifications();
  const markAsRead = useMarkAllInboxNotificationsAsRead();

  return (
    <>
      <button onClick={markAsRead}>
        <CheckCheckIcon className="w-4 h-4 text-emerald-700" />
      </button>
      <button onClick={deleteAll}>
        <RubbishIcon className="w-4 h-4 text-red-700" />
      </button>
    </>
  );
}

function InboxNotifications() {
  const { inboxNotifications } = useInboxNotifications();

  // Only show thread notifications, and only one notification for each thread
  const filteredNotifications = useMemo(() => {
    const filtered: InboxNotificationData[] = [];

    for (const notification of inboxNotifications) {
      if (
        notification.kind === "thread" &&
        !filtered.find(
          (n) => n.kind === "thread" && n.threadId === notification.threadId
        )
      ) {
        filtered.push(notification);
      }
    }

    return filtered;
  }, [inboxNotifications]);

  if (!inboxNotifications.length) {
    return (
      <div className="text-center text-sm font-medium text-gray-600 p-4 flex justify-center items-center h-full">
        You have no notifications
      </div>
    );
  }

  return (
    <InboxNotificationList>
      {filteredNotifications.map((inboxNotification) => (
        <div className="relative h-[66px] p-1" key={inboxNotification.id}>
          <ClientSideSuspense
            fallback={
              <div className="absolute inset-0 w-full [h-165px] px-3 py-2.5 gap-2 m-1 rounded flex flex-row items-center">
                <div className="h-8 w-8">
                  <div className="rounded-full overflow-hidden">
                    <div className="w-7 h-7 bg-neutral-100 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="flex-grow w-full overflow-hidden">
                  <div className="font-medium text-neutral-700 truncate">
                    <div className="w-28 h-4 bg-neutral-100  animate-pulse rounded" />
                  </div>
                  <div className="text-xs text-neutral-400 w-full truncate">
                    <div className="w-48 h-4 bg-neutral-100 animate-pulse mt-1 rounded" />
                  </div>
                </div>
              </div>
            }
          >
            <SmallInboxNotification inboxNotification={inboxNotification} />
          </ClientSideSuspense>
        </div>
      ))}
    </InboxNotificationList>
  );
}

function SmallInboxNotification({
  inboxNotification,
}: {
  inboxNotification: InboxNotificationData;
}) {
  const params = useParams();
  const thread = useInboxNotificationThread(inboxNotification.id);
  const { info, error, isLoading } = useRoomInfo(
    inboxNotification?.roomId || ""
  );

  // Get latest non-deleted comment for notification preview
  const latestComment = useMemo(() => {
    const filterDeleted = thread.comments.filter(
      (comment) => !comment?.deletedAt
    );
    return filterDeleted[filterDeleted.length - 1];
  }, [thread]);

  const { user } = useUser(latestComment.userId);
  const markAsRead = useMarkInboxNotificationAsRead();

  const { openInbox } = useInbox();

  if (
    !latestComment ||
    !inboxNotification?.roomId ||
    isLoading ||
    error ||
    !info.metadata.issueId
  ) {
    return null;
  }
  return (
    <NextLink
      href={`/issue/${info?.metadata.issueId}`}
      onClick={() => {
        openInbox();
        markAsRead(inboxNotification.id);
      }}
    >
      <div
        className={classNames(
          "flex flex-row items-center px-3 py-2.5 gap-2 rounded",
          {
            "bg-blue-100/60": inboxNotification.readAt === null,
          },
          {
            "bg-neutral-200/40":
              params.id && inboxNotification.roomId.endsWith(`${params.id}`),
          }
        )}
      >
        <div className="h-8 w-8">
          <div className="rounded-full overflow-hidden">
            <Avatar userId={latestComment.userId} />
          </div>
        </div>
        <div className="flex-grow w-full overflow-hidden">
          <div className="font-medium text-neutral-700 truncate flex justify-between items-center">
            {info.metadata.title}
            {inboxNotification.readAt === null ? (
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
            ) : null}
          </div>
          <div className="text-xs text-neutral-400 w-full truncate flex items-center gap-[3px]">
            <span>{user.name}:</span>
            <Comment.Body
              className="overflow-hidden *:truncate"
              body={latestComment.body}
              components={{ Mention, Link }}
            />
          </div>
        </div>
      </div>
    </NextLink>
  );
}
