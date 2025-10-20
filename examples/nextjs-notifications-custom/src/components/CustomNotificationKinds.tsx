import {
  InboxNotification,
  InboxNotificationCustomKindProps,
} from "@liveblocks/react-ui";
import styles from "./CustomNotificationKinds.module.css";
import { WarningIcon } from "./Icons";
import { Button } from "./Button";
import { useRoomInfo, useUser } from "@liveblocks/react/suspense";

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
      title={<strong>Issue updated</strong>}
      aside={
        <div className={styles.warningIcon}>
          <WarningIcon />
        </div>
      }
    >
      {activities.map((activity: (typeof activities)[number]) => {
        const { type } = activity.data;

        if (type === "assign") {
          return <div>Assigned to {activity.data.name}</div>;
        }

        if (type === "rename") {
          return <div>Renamed to {activity.data.title}</div>;
        }

        if (type === "status") {
          return <div>Status changed to {activity.data.status}</div>;
        }

        return null;
      })}
    </InboxNotification.Custom>
  );
}
