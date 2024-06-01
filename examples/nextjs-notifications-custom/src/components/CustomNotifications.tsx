"use client";

import styles from "./CustomNotifications.module.css";
import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-comments";
import {
  useInboxNotifications,
  useMarkInboxNotificationAsRead,
  useSelf,
} from "../liveblocks.config";
import { ErrorBoundary } from "react-error-boundary";
import {
  alertNotification,
  inviteNotification,
  imageUploadNotification,
} from "../actions";
import { Button } from "./Button";
import {
  AlertNotification,
  ImageUploadNotification,
  InviteNotification,
} from "./CustomNotificationKinds";
import { ClientSideSuspense } from "@liveblocks/react";

export function CustomNotifications() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.buttonPanel}>
        <h2>Send notifications</h2>
        <ClientSideSuspense fallback={null}>
          {() => <SendNotificationButtons />}
        </ClientSideSuspense>
      </div>

      <div className={styles.notificationPanel}>
        <h2>Notification panel</h2>
        <ErrorBoundary
          fallback={<div className="error">Error getting notifications</div>}
        >
          <ClientSideSuspense fallback={null}>
            {() => <NotificationPanel />}
          </ClientSideSuspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function SendNotificationButtons() {
  const self = useSelf();

  return (
    <div className={styles.buttonBar}>
      <Button
        onClick={async () => {
          await alertNotification(self.id, {
            title: "Warning!",
            message: "Your account may be at risk if you don’t take action.",
          });
          location.reload();
        }}
      >
        Alert
      </Button>

      <Button
        onClick={async () => {
          await inviteNotification(self.id, {
            inviteFrom: "emil.joyce@example.com",
            roomId: "my-org:my-team:room-1",
          });
          location.reload();
        }}
      >
        Invite
      </Button>

      <Button
        onClick={async () => {
          await imageUploadNotification(self.id, {
            src: "/atoll.png",
            alt: "A Polynesian atoll",
            uploadedBy: "quinn.elton@example.com",
          });
          location.reload();
        }}
      >
        Image upload
      </Button>
    </div>
  );
}

function NotificationPanel() {
  const { inboxNotifications } = useInboxNotifications();

  if (inboxNotifications.length === 0) {
    return <div>No notifications yet</div>;
  }

  return (
    <InboxNotificationList className={styles.notificationList}>
      {inboxNotifications.map((inboxNotification) => (
        <InboxNotification
          key={inboxNotification}
          inboxNotification={inboxNotification}
          kinds={{
            $alert: AlertNotification,
            $imageUpload: ImageUploadNotification,
            $invite: InviteNotification,
          }}
        />
      ))}
    </InboxNotificationList>
  );
}
