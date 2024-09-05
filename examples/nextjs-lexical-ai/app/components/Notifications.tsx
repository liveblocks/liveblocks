"use client";

import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
  ClientSideSuspense,
  useDeleteAllInboxNotifications,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import { Loading } from "./Loading";
import * as Dialog from "@radix-ui/react-dialog";

export function Notifications() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex relative items-center justify-between whitespace-nowrap rounded-md font-medium transition-colors w-full px-2 py-1 hover:bg-gray-200">
        <div className="flex items-center gap-1.5 flex-1">
          <svg
            width="20"
            height="20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m3.6 9.8 1.9-4.6A2 2 0 0 1 7.3 4h5.4a2 2 0 0 1 1.8 1.2l2 4.6V13a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9.8Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M3.5 10h3c.3 0 .6.1.8.4l.9 1.2c.2.3.5.4.8.4h2c.3 0 .6-.1.8-.4l.9-1.2c.2-.3.5-.4.8-.4h3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Inbox
        </div>

        <ClientSideSuspense fallback={null}>
          <UnreadNotificationsCount />
        </ClientSideSuspense>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content className="bg-white shadow-xl text-sm overflow-hidden w-[380px] z-20 fixed top-0 left-[240px] bottom-0">
          <ClientSideSuspense fallback={<Loading />}>
            <Inbox />
          </ClientSideSuspense>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UnreadNotificationsCount() {
  const { count } = useUnreadInboxNotificationsCount();

  if (count <= 0) return null;

  return (
    <span className="text-[10px] inline-flex items-center p-1 bg-blue-500 text-white justify-center rounded w-4 h-4">
      {count}
    </span>
  );
}

function Inbox() {
  const { inboxNotifications } = useInboxNotifications();
  const markAllNotificationsAsRead = useMarkAllInboxNotificationsAsRead();
  const deleteAllNotifications = useDeleteAllInboxNotifications();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex p-3 border-b border-border justify-end bg-muted/50 gap-1.5 flex-0">
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-4 py-2"
          disabled={inboxNotifications.length === 0}
          onClick={markAllNotificationsAsRead}
        >
          Mark all as read
        </button>
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-primary-foreground shadow hover:bg-primary/90 h-8 px-4 py-2"
          disabled={inboxNotifications.length === 0}
          onClick={deleteAllNotifications}
        >
          Delete all
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto">
          {inboxNotifications.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <InboxNotificationList>
              {inboxNotifications.map((inboxNotification) => {
                return (
                  <InboxNotification
                    key={inboxNotification.id}
                    inboxNotification={inboxNotification}
                  />
                );
              })}
            </InboxNotificationList>
          )}
        </div>
      </div>
    </div>
  );
}
