"use client";

import styles from "./CustomNotifications.module.css";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import {
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useSelf,
  useUnreadInboxNotificationsCount,
  useDeleteAllInboxNotifications,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
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

export function CustomNotifications() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.buttonPanel}>
        <h2>Send notifications</h2>

        <ClientSideSuspense fallback={null}>
          <SendNotificationButtons />
        </ClientSideSuspense>
      </div>

      <div className={styles.notificationPanel}>
        <h2>Notification panel</h2>
        <ErrorBoundary
          fallback={<div className="error">Error getting notifications</div>}
        >
          <ClientSideSuspense fallback={null}>
            <NotificationPanel />
          </ClientSideSuspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function SendNotificationButtons() {
  // These notifications are sent to the current user
  // with `self.id`, but they can go to any user ID
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

      {/* payment or delivery one, the message inside updates every time, its not a list */}

      {/* moved a file, renamed it, set a reviewer, etc */}

      {/* like linear: edited by X, status changed, assign to Y */}

      {/* invoice: submitted, approved, paid */}

      {/* transactions: charged company, refund, payout done */}

      {/* event scheduled, time changed, agenda added, document uploaded */}
      <Button
        onClick={async () => {
          await imageUploadNotification(self.id, {});
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
  const { count } = useUnreadInboxNotificationsCount();
  const markInboxNotificationAsRead = useMarkAllInboxNotificationsAsRead();
  const deleteAllInboxNotifications = useDeleteAllInboxNotifications();

  if (inboxNotifications.length === 0) {
    return <div>No notifications yet</div>;
  }

  return (
    <>
      <div className={styles.topBar}>
        <span>{count} unread</span>
        <div className={styles.topBarButtons}>
          <Button onClick={markInboxNotificationAsRead}>
            Mark all as read
          </Button>
          <Button onClick={deleteAllInboxNotifications} variant="destructive">
            Delete all
          </Button>
        </div>
      </div>
      <InboxNotificationList className={styles.notificationList}>
        {inboxNotifications.map((inboxNotification) => (
          <InboxNotification
            key={inboxNotification.id}
            inboxNotification={inboxNotification}
            kinds={{
              $alert: AlertNotification,
              $imageUpload: ImageUploadNotification,
              $invite: InviteNotification,
            }}
          />
        ))}
      </InboxNotificationList>
    </>
  );
}
