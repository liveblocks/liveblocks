import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import * as Popover from "@radix-ui/react-popover";
import { Suspense } from "react";
import Loading from "./loading";

export default function Notifications() {
  return (
    <Popover.Root>
      <Popover.Trigger className="relative w-8 h-8 rounded-md inline-flex items-center justify-center p-1 text-center text-sm font-medium bg-gray-50 hover:bg-gray-100 text-gray-900 transition-colors">
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

        <Suspense fallback={null}>
          <UnreadNotificationsCount />
        </Suspense>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          className="text-sm bg-white rounded-md border overflow-hidden w-[500px]"
        >
          <Suspense fallback={<Loading />}>
            <Inbox />
          </Suspense>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function UnreadNotificationsCount() {
  const { count } = useUnreadInboxNotificationsCount();

  if (count <= 0) return null;

  return (
    <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 text-[10px] inline-flex items-center p-1 bg-blue-500 text-white justify-center rounded-full w-4 h-4">
      {count}
    </span>
  );
}

function Inbox() {
  const { inboxNotifications } = useInboxNotifications();
  const markAllNotificationsAsRead = useMarkAllInboxNotificationsAsRead();

  return (
    <>
      <div className="flex bg-[#fafafa] p-3 border-b justify-end">
        <button
          className="inline-flex h-8 select-none text-sm items-center whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900 px-3.5 font-medium text-zinc-100 ease-in-out hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 relative transition-all"
          disabled={inboxNotifications.length === 0}
          onClick={markAllNotificationsAsRead}
        >
          Mark all as read
        </button>
      </div>

      <div className="max-h-[500px] overflow-auto">
        {inboxNotifications.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-slate-500">
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
    </>
  );

  return (
    <>
      {inboxNotifications.length === 0 ? (
        <div className="flex items-center justify-center">
          There aren’t any notifications yet.
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
    </>
  );
}
