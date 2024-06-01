import {
  InboxNotification,
  InboxNotificationCustomProps,
} from "@liveblocks/react-comments";
import { AlertData, ImageUploadData, InviteData } from "../actions";
import styles from "./CustomNotificationKinds.module.css";
import { WarningIcon } from "./Icons";
import { Button } from "./Button";
import { Room, useRoomInfo, useUser } from "../liveblocks.config";

export function AlertNotification({
  inboxNotification,
}: InboxNotificationCustomProps) {
  const { title, message } = inboxNotification.activities[0].data as AlertData;

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
}: InboxNotificationCustomProps) {
  const { src, alt, uploadedBy } = inboxNotification.activities[0]
    .data as ImageUploadData;
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
}: InboxNotificationCustomProps) {
  const { inviteFrom, roomId } = inboxNotification.activities[0]
    .data as InviteData;

  // Fetch room and user info from resolvers in liveblocks.config.ts
  const { info } = useRoomInfo(roomId) as unknown as Room;
  const { user: inviter } = useUser(inviteFrom);

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
