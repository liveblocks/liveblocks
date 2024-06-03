import { useInboxNotifications } from "@/liveblocks.config";
import styles from "@/components/Notification.module.css";
import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-comments";

export default function Notifications() {
  const { inboxNotifications } = useInboxNotifications();
  return (
    <div className={styles.container}>
      {inboxNotifications.length === 0 ? (
        <div className={styles.emptyNotifications}>
          There aren’t any notifications yet.
        </div>
      ) : (
        <InboxNotificationList className={styles.inboxList}>
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
  );
}
