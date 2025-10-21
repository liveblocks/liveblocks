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
  issueUpdatedNotification,
} from "../actions";
import { Button } from "./Button";
import {
  AlertNotification,
  ImageUploadNotification,
  InviteNotification,
  IssueUpdatedNotification,
} from "./CustomNotificationKinds";
import { nanoid } from "nanoid";
import { USER_INFO, getRandomStatus } from "../database";

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
    <div>
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
      <h3>Batched notifications</h3>
      {/*
        For batched notifications to work you must enable batching in the
        Notifications dashboard page for the custom kind. This example
        uses the `$issueUpdated` kind.
        https://liveblocks.io/docs/ready-made-features/notifications/concepts#Notification-batching

        If you then post using the same `subjectId` the existing notification
        will be updated with new `activityData`. In this example we're storing
        the last used `subjectId` in local storage for demonstration purposes.
        https://liveblocks.io/docs/api-reference/liveblocks-node#Batching-custom-notifications

        In our custom `IssueUpdatedNotification` component we then render the
        acitivies as a list inside the notification.
        https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Batching-custom-notifications
      */}
      <div className={styles.buttonBar}>
        <Button
          onClick={async () => {
            await issueUpdatedNotification(self.id, {
              subjectId: newSubjectId(),
              type: "create",
              title: "New issue",
            });
            location.reload();
          }}
        >
          New issue
        </Button>

        <Button
          variant="secondary"
          onClick={async () => {
            await issueUpdatedNotification(self.id, {
              subjectId: getSubjectId(),
              type: "status",
              status: getRandomStatus(),
            });
            location.reload();
          }}
        >
          Update status
        </Button>

        <Button
          variant="secondary"
          onClick={async () => {
            await issueUpdatedNotification(self.id, {
              subjectId: getSubjectId(),
              type: "rename",
              title: getRandomIssueName(),
            });
            location.reload();
          }}
        >
          Rename issue
        </Button>

        <Button
          variant="secondary"
          onClick={async () => {
            await issueUpdatedNotification(self.id, {
              subjectId: getSubjectId(),
              type: "assign",
              userId: getRandomUser().id,
            });
            location.reload();
          }}
        >
          Assign issue
        </Button>
      </div>
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
              $issueUpdated: IssueUpdatedNotification,
            }}
          />
        ))}
      </InboxNotificationList>
    </>
  );
}

// All functions below are just used to generate random data for the demo
function getSubjectId() {
  const existingId = localStorage.getItem("subjectId");

  if (typeof existingId === "string") {
    return existingId;
  }

  const newId = nanoid();
  localStorage.setItem("subjectId", newId);
  return newId;
}

function newSubjectId() {
  const subjectId = nanoid();
  localStorage.setItem("subjectId", subjectId);
  return subjectId;
}

function getRandomIssueName() {
  const issueNames = [
    "Fix login bug",
    "Implement dark mode",
    "Add user authentication",
    "Optimize database queries",
    "Update documentation",
    "Refactor component structure",
    "Add error handling",
    "Improve performance",
    "Fix responsive design",
    "Add unit tests",
  ];
  return issueNames[Math.floor(Math.random() * issueNames.length)];
}

function getRandomUser() {
  return USER_INFO[Math.floor(Math.random() * USER_INFO.length)];
}
