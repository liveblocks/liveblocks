"use client";

import {
  useInboxNotifications,
  ClientSideSuspense,
  useUser,
  useMarkAllInboxNotificationsAsRead,
  useDeleteAllInboxNotifications,
} from "@liveblocks/react/suspense";
import { InboxNotificationList } from "@liveblocks/react-ui";
import { Comment } from "@liveblocks/react-ui/primitives";
import { ErrorBoundary } from "react-error-boundary";
import { InboxNotificationData, stringifyCommentBody } from "@liveblocks/core";
import { Avatar } from "@/components/Avatar";
import classNames from "classnames";
import { useRoomInfo, useInboxNotificationThread } from "@liveblocks/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { Mention } from "@/components/Mention";
import { Link } from "@/components/Link";

export function Inbox() {
  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <div className="flex items-center justify-between px-4 text-sm border-b h-10">
        <div>Inbox</div>
        <div className="flex gap-2 text-xl">
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
      <button onClick={markAsRead}>✓</button>
      <button onClick={deleteAll}>✗</button>
    </>
  );
}

function InboxNotifications() {
  const { inboxNotifications } = useInboxNotifications();

  if (!inboxNotifications.length) {
    return (
      <div className="text-center text-sm font-medium text-gray-600 p-4 flex justify-center items-center h-full">
        You have no notifications
      </div>
    );
  }

  return (
    <InboxNotificationList>
      {inboxNotifications.map((inboxNotification, index) => (
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
  const thread = useInboxNotificationThread(inboxNotification.id);
  const { user } = useUser(thread.comments[0].userId);
  const { info, error, isLoading } = useRoomInfo(
    inboxNotification?.roomId || ""
  );
  const params = useParams();

  if (
    !thread.comments[0].body ||
    !inboxNotification?.roomId ||
    isLoading ||
    error ||
    !info.metadata.issueId
  ) {
    return null;
  }
  return (
    <NextLink href={`/issue/${info?.metadata.issueId}`}>
      <div
        className={classNames(
          "flex flex-row items-center px-3 py-2.5 gap-2 rounded",
          {
            "bg-neutral-200/40":
              params.id && inboxNotification.roomId.endsWith(`${params.id}`),
          }
        )}
      >
        <div className="h-8 w-8">
          <div className="rounded-full overflow-hidden">
            <Avatar userId={thread.comments[0].userId} />
          </div>
        </div>
        <div className="flex-grow w-full overflow-hidden">
          <div className="font-medium text-neutral-700 truncate">
            {info.metadata.title}
          </div>
          <div className="text-xs text-neutral-400 w-full truncate flex items-center gap-[3px] overflow-hidden">
            <span>{user.name}:</span>
            <div className="flex-grow-0 truncate">
              <Comment.Body
                className="*:truncate"
                body={thread.comments[0].body}
                components={{ Mention, Link }}
              />
            </div>
          </div>
        </div>
      </div>
    </NextLink>
  );
}
