import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import * as Popover from "@radix-ui/react-popover";
import { Suspense } from "react";
import Loading from "./loading";

export default function NotificationsPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8">
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
          className="rounded-xl border border-border bg-card text-card-foreground shadow text-sm overflow-hidden w-[500px] min-h-[200px] z-20"
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
      <div className="flex p-3 border-b border-border justify-end bg-muted/50">
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-4 py-2"
          disabled={inboxNotifications.length === 0}
          onClick={markAllNotificationsAsRead}
        >
          Mark all as read
        </button>
      </div>

      <div className="max-h-[500px] overflow-auto">
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
    </>
  );
}
