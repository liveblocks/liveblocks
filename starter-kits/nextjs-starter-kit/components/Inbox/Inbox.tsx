import { ClientSideSuspense } from "@liveblocks/react";
import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import clsx from "clsx";
import { ComponentProps } from "react";
import { SettingsIcon } from "@/icons";
import { Button } from "@/primitives/Button";
import { Link } from "@/primitives/Link";
import { Spinner } from "@/primitives/Spinner";
import { AddedToDocumentNotification } from "./CustomNotifications";
import { InboxSettingsDialog } from "./InboxSettingsDialog";
import styles from "./Inbox.module.css";

export function Inbox({ className, ...props }: ComponentProps<"div">) {
  // Count unread notifications to tell if "mark all" button should be disabled
  const markAllInboxNotificationsAsRead = useMarkAllInboxNotificationsAsRead();
  const { count } = useUnreadInboxNotificationsCount();

  return (
    <div className={clsx(className, styles.inbox)} {...props}>
      <div className={styles.inboxHeader}>
        <h2>Notifications</h2>
        <div className={styles.inboxHeaderButtons}>
          <Button
            variant="primary"
            onClick={markAllInboxNotificationsAsRead}
            disabled={count === 0}
          >
            Mark all as read
          </Button>
          <InboxSettingsDialog>
            <Button variant="secondary" iconButton>
              <span className="sr-only">Notification channels</span>
              <SettingsIcon />
            </Button>
          </InboxSettingsDialog>
        </div>
      </div>
      <ClientSideSuspense
        fallback={
          <div className={styles.emptyState}>
            <Spinner />
          </div>
        }
      >
        <InboxContent />
      </ClientSideSuspense>
    </div>
  );
}

// Render all inbox notifications
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
                kinds={{
                  // Custom component for custom notification
                  $addedToDocument: AddedToDocumentNotification,
                }}
              />
            );
          })}
        </InboxNotificationList>
      )}
    </div>
  );
}
