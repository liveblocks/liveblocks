"use client";

import {
  useInboxNotifications,
  ClientSideSuspense,
  useInboxNotificationThread,
  useUser,
} from "@liveblocks/react/suspense";
import { InboxNotificationList } from "@liveblocks/react-ui";
import { Comment } from "@liveblocks/react-ui/primitives";
import { ErrorBoundary } from "react-error-boundary";
import { InboxNotificationData, stringifyCommentBody } from "@liveblocks/core";
import { Avatar } from "@/components/Avatar";
import classNames from "classnames";
import { useRoomData } from "@/hooks/useRoomData";

export function Inbox() {
  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <ClientSideSuspense fallback={null}>
        <InboxNotifications />
      </ClientSideSuspense>
    </ErrorBoundary>
  );
}

function InboxNotifications() {
  const { inboxNotifications } = useInboxNotifications();

  return (
    <InboxNotificationList>
      {inboxNotifications.map((inboxNotification, index) => (
        <SmallInboxNotification
          key={inboxNotification.id}
          inboxNotification={inboxNotification}
          selected={index === 0}
        />
      ))}
    </InboxNotificationList>
  );
}

function SmallInboxNotification({
  inboxNotification,
  selected,
}: {
  inboxNotification: InboxNotificationData;
  selected: boolean;
}) {
  const thread = useInboxNotificationThread(inboxNotification.id);
  const { user } = useUser(thread.comments[0].userId);
  const { roomData } = useRoomData();

  if (!thread.comments[0].body || !roomData) {
    return null;
  }

  return (
    <a
      href={`/inbox/${roomData.metadata.issueId}`}
      className={classNames(
        "flex flex-row items-center px-3 py-2.5 gap-2 m-1 rounded",
        {
          "bg-neutral-200/40": selected,
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
          {roomData.metadata.title}
        </div>
        <div className="text-xs text-neutral-400 w-full truncate">
          {user.name} commented: {stringifyCommentBody(thread.comments[0].body)}
        </div>
      </div>
    </a>
  );
}
