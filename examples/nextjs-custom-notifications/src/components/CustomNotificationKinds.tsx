import {
  InboxNotification,
  InboxNotificationCustomProps,
  InboxNotificationProps,
} from "@liveblocks/react-comments";
import { AlertData, InviteData } from "../actions";
import styles from "./CustomNotifications.module.css";
import { WarningIcon } from "./Icons";
import { Button } from "./Button";

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
  const { inviteFrom, documentTitle } = inboxNotification.activities[0]
    .data as InviteData;

  return (
    <div className={styles.welcomeNotification}>
      <div>
        {inviter.name} has invited you to {documentTitle}
      </div>
      <div>
        <Button>Accept</Button>
        <Button>Decline</Button>
      </div>
    </div>
  );
}
