"use client";

import styles from "./CustomNotifications.module.css";
import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-comments";
import { useInboxNotifications, useSelf } from "../liveblocks.config";
import { ErrorBoundary } from "react-error-boundary";
import { AlertData, alertNotification, newUserNotification } from "../actions";
import {
  InboxNotificationCustomData,
  InboxNotificationData,
} from "@liveblocks/core";
import { WarningIcon } from "./Icons";

export function CustomNotifications() {
  return (
    <div className={styles.wrapper}>
      <ButtonPanel />
      <ErrorBoundary
        fallback={<div className="error">Error getting notifications.</div>}
      >
        <NotificationPanel />
      </ErrorBoundary>
    </div>
  );
}

function ButtonPanel() {
  const self = useSelf();

  return (
    <div className={styles.buttonPanel}>
      <h2>Send notifications</h2>
      <button
        onClick={() =>
          alertNotification(self.id, {
            title: "Warning!",
            message: "You have a problem",
          })
        }
      >
        Alert
      </button>
      <button onClick={() => newUserNotification(self.id)}>New user</button>
    </div>
  );
}

function NotificationPanel() {
  const { inboxNotifications } = useInboxNotifications();

  if (inboxNotifications.length === 0) {
    return <div>No notifications!</div>;
  }

  return (
    <div className={styles.notificationPanel}>
      <h2>Notification panel</h2>
      <InboxNotificationList className={styles.notificationList}>
        {inboxNotifications.map((inboxNotification) => (
          <InboxNotification
            key={inboxNotification.id}
            inboxNotification={inboxNotification}
            kinds={{
              $alert({ inboxNotification }) {
                const { title, message } = inboxNotification.activities[0]
                  .data as AlertData;
                return (
                  <InboxNotification.Custom
                    title={<>{inboxNotification.activities[0].data.title}</>}
                    aside={
                      <div className={styles.warningIcon}>
                        <WarningIcon />
                      </div>
                    }
                    inboxNotification={inboxNotification}
                  >
                    {inboxNotification.activities[0].data.message}
                  </InboxNotification.Custom>
                );
              },

              $newUser: ({ inboxNotification }) => (
                <div className={styles.newUserNotification}>
                  <div>Welcome to our application</div>
                  <div>
                    <button>Overview</button>
                    <button>Settings</button>
                  </div>
                </div>
              ),
            }}
          />
        ))}
      </InboxNotificationList>
    </div>
  );
}
