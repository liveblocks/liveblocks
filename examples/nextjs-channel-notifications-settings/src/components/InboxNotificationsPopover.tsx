"use client";

import * as Popover from "@radix-ui/react-popover";
import { Button } from "@/components/Button";

import styles from "./InboxNotificationsPopover.module.css";
import {
  useInboxNotifications,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import { Suspense } from "react";

const UnreadNotificationsCount = () => {
  const { count } = useUnreadInboxNotificationsCount();
  if (count <= 0) {
    return null;
  }

  return <span className={styles.inboxNotificationUnreadCount}>{count}</span>;
};

const Inbox = () => {
  const { inboxNotifications } = useInboxNotifications();
  return (
    <div className={styles.inboxContent}>
      {inboxNotifications.length === 0 ? (
        <div className={styles.inboxContentEmpty}>No notifications yet</div>
      ) : (
        <InboxNotificationList>
          {inboxNotifications.map((inboxNotification) => (
            <InboxNotification
              key={inboxNotification.id}
              inboxNotification={inboxNotification}
            />
          ))}
        </InboxNotificationList>
      )}
    </div>
  );
};

export function InboxNotificationsPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          className={styles.inboxNotificationsPopoverButton}
          variant="subtle"
        >
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
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          className={styles.inboxNotificationsPopoverContent}
        >
          <Suspense fallback={null}>
            <Inbox />
          </Suspense>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
