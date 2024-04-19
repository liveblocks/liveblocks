import { ClientSideSuspense } from "@liveblocks/react";
import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-comments";
import clsx from "clsx";
import { ComponentProps } from "react";
import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
} from "@/liveblocks.config";
import { Button } from "@/primitives/Button";
import { Link } from "@/primitives/Link";
import { Spinner } from "@/primitives/Spinner";
import styles from "./Inbox.module.css";

function InboxContent(props: ComponentProps<"div">) {
  const { inboxNotifications } = useInboxNotifications();

  return (
    <div {...props}>
      {inboxNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <p>There aren’t any notifications yet.</p>
        </div>
      ) : (
        <InboxNotificationList>
          {inboxNotifications.map((inboxNotification) => {
            return (
              <InboxNotification
                key={inboxNotification.id}
                inboxNotification={inboxNotification}
                components={{ Anchor: Link }}
              />
            );
          })}
        </InboxNotificationList>
      )}
    </div>
  );
}

export function Inbox({ className, ...props }: ComponentProps<"div">) {
  const markAllInboxNotificationsAsRead = useMarkAllInboxNotificationsAsRead();

  return (
    <div className={clsx(className, styles.inbox)} {...props}>
      <div className={styles.inboxHeader}>
        <h2>Notifications</h2>
        <Button onClick={markAllInboxNotificationsAsRead}>
          Mark all as read
        </Button>
      </div>
      <ClientSideSuspense
        fallback={
          <div className={styles.emptyState}>
            <Spinner />
          </div>
        }
      >
        {() => <InboxContent />}
      </ClientSideSuspense>
    </div>
  );
}
