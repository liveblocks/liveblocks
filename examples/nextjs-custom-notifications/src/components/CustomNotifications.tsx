"use client";

import styles from "./CustomNotifications.module.css";
import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-comments";
import { useInboxNotifications, useSelf } from "../liveblocks.config";
import { ErrorBoundary } from "react-error-boundary";
import {
  AlertData,
  alertNotification,
  inviteNotification,
  welcomeNotification,
} from "../actions";
import { WarningIcon } from "./Icons";
import { useState } from "react";
import { Button } from "./Button";
import {
  AlertNotification,
  InviteNotification,
  WelcomeNotification,
} from "./CustomNotificationKinds";

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
      <Button
        onClick={() =>
          alertNotification(self.id, {
            title: "Warning!",
            message: "You have a problem",
          })
        }
      >
        Alert
      </Button>
      <Button onClick={() => welcomeNotification(self.id)}>New user</Button>
      <Button
        onClick={() =>
          inviteNotification(self.id, {
            inviteFrom: "emil.joyce@example.com",
            documentTitle: "My document",
          })
        }
      >
        New user
      </Button>
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
              $alert: AlertNotification,
              $welcome: WelcomeNotification,
              $invite: InviteNotification,
            }}
          />
        ))}
      </InboxNotificationList>
    </div>
  );
}
