import {
  InboxNotification,
  InboxNotificationCustomKindProps,
} from "@liveblocks/react-ui";
import styles from "./CustomNotificationKinds.module.css";
import {
  IssueIcon,
  ProgressDoneIcon,
  ProgressInReviewIcon,
  ProgressInProgressIcon,
  ProgressTodoIcon,
  WarningIcon,
} from "./Icons";
import { Button } from "./Button";
import { useRoomInfo, useUser } from "@liveblocks/react/suspense";
import { getUser } from "../database";
import { ReactNode } from "react";

// How to render custom notification kinds
// https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Rendering-notification-kinds-differently
//
// Types for your custom notification kinds are defined in `/liveblocks.config.ts`
// https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Typing-custom-notifications

export function AlertNotification({
  inboxNotification,
}: InboxNotificationCustomKindProps<"$alert">) {
  const { title, message } = inboxNotification.activities[0].data;

  return (
    <InboxNotification.Custom
      title={<strong>{title}</strong>}
      aside={
        <div className={styles.warningIcon}>
          <WarningIcon />
        </div>
      }
      inboxNotification={inboxNotification}
    >
      {message}
    </InboxNotification.Custom>
  );
}

export function ImageUploadNotification({
  inboxNotification,
}: InboxNotificationCustomKindProps<"$imageUpload">) {
  const { src, alt, uploadedBy } = inboxNotification.activities[0].data;
  const { user: uploader } = useUser(uploadedBy);

  return (
    <InboxNotification.Custom
      inboxNotification={inboxNotification}
      title={
        <>
          <strong>New image</strong> uploaded by{" "}
          <strong>{uploader.name}</strong>
        </>
      }
      aside={<InboxNotification.Avatar userId={uploadedBy} />}
      href={src}
    >
      <small>{alt}</small>
      <img src={src} alt={alt} className={styles.image} />
    </InboxNotification.Custom>
  );
}

export function InviteNotification({
  inboxNotification,
}: InboxNotificationCustomKindProps<"$invite">) {
  const { inviteFrom, roomId } = inboxNotification.activities[0].data;

  // Fetch room and user info from resolvers in liveblocks.config.ts
  const { info, error, isLoading } = useRoomInfo(roomId);
  const { user: inviter } = useUser(inviteFrom);

  if (error || isLoading) {
    return null;
  }

  return (
    <InboxNotification.Custom
      inboxNotification={inboxNotification}
      title={
        <>
          <strong>{inviter.name}</strong> invited you to{" "}
          <strong>{info.title}</strong>
        </>
      }
      aside={<InboxNotification.Avatar userId={inviteFrom} />}
    >
      <div>
        <small>Document preview</small>
        <div>{info.description}</div>
      </div>
      <div className={styles.buttonBar}>
        <Button>Accept</Button>
        <Button variant="secondary">Decline</Button>
      </div>
    </InboxNotification.Custom>
  );
}

export function IssueUpdatedNotification({
  inboxNotification,
}: InboxNotificationCustomKindProps<"$issueUpdated">) {
  const { activities } = inboxNotification;

  return (
    <InboxNotification.Custom
      inboxNotification={inboxNotification}
      title={<strong>New issue</strong>}
      aside={
        <div className={styles.issueIcon}>
          <IssueIcon />
        </div>
      }
    >
      <div className={styles.timeline}>
        {[...activities]
          .reverse()
          .map((activity: (typeof activities)[number], index) => {
            const { type } = activity.data;

            if (type === "assign") {
              const user = getUser(activity.data.userId);

              return (
                <TimelineItem key={index}>
                  Assigned to{" "}
                  <InboxNotification.Avatar
                    userId={activity.data.userId}
                    style={{ width: 18 }}
                  />
                  <strong>{user?.info.name ?? "Unknown user"}</strong>
                </TimelineItem>
              );
            }

            if (type === "rename") {
              return (
                <TimelineItem key={index}>
                  Renamed to <strong>“{activity.data.title}”</strong>
                </TimelineItem>
              );
            }

            if (type === "status") {
              const status = activity.data.status;
              const icon =
                status === "Done" ? (
                  <ProgressDoneIcon />
                ) : status === "In Review" ? (
                  <ProgressInReviewIcon />
                ) : status === "In Progress" ? (
                  <ProgressInProgressIcon />
                ) : (
                  <ProgressTodoIcon />
                );
              return (
                <TimelineItem key={index}>
                  Changed to {icon}
                  <strong>{activity.data.status}</strong>
                </TimelineItem>
              );
            }

            return null;
          })}
      </div>
    </InboxNotification.Custom>
  );
}

export function TimelineItem({ children }: { children: ReactNode }) {
  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineConnector}>
        <div className={styles.timelineCircle} />
        <div className={styles.timelineLine} />
      </div>
      <div className={styles.timelineContent}>{children}</div>
    </div>
  );
}
