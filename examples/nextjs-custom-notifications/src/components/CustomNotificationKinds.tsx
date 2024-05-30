import {
  InboxNotification,
  InboxNotificationCustomProps,
  InboxNotificationProps,
} from "@liveblocks/react-comments";
import { AlertData, InviteData } from "../actions";
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
}

export function WelcomeNotification({
  inboxNotification,
}: InboxNotificationCustomProps) {
  return (
    <div className={styles.welcomeNotification}>
      <div>Welcome to our application</div>
      <div>
        <button>Overview</button>
        <button>Settings</button>
      </div>
    </div>
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
