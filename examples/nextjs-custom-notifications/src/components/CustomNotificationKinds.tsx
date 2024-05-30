import {
  InboxNotification,
  InboxNotificationCustomProps,
} from "@liveblocks/react-comments";
import { AlertData, ImageUploadData, InviteData } from "../actions";
import styles from "./CustomNotificationKinds.module.css";
import { WarningIcon } from "./Icons";
import { Button } from "./Button";
import { useUser } from "../liveblocks.config";

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
    >
      <small>{alt}</small>
      <img src={src} alt={alt} className={styles.image} />
      <Button variant="secondary">Details</Button>
    </InboxNotification.Custom>
  );
}

export function InviteNotification({
  inboxNotification,
}: InboxNotificationCustomProps) {
  const { inviteFrom, documentTitle, documentDescription } = inboxNotification
    .activities[0].data as InviteData;
  const { user: inviter } = useUser(inviteFrom);

  return (
    <InboxNotification.Custom
      inboxNotification={inboxNotification}
      title={
        <>
          <strong>{inviter.name}</strong> invited you to{" "}
          <strong>{documentTitle}</strong>
        </>
      }
      aside={<InboxNotification.Avatar userId={inviteFrom} />}
    >
      <div>
        <small>Document preview</small>
        <div>{documentDescription}</div>
      </div>
      <div className={styles.buttonBar}>
        <Button>Accept</Button>
        <Button variant="secondary">Decline</Button>
      </div>
    </InboxNotification.Custom>
  );
}
