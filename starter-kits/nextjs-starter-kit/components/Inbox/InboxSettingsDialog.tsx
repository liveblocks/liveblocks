import {
  useIsInsideRoom,
  useNotificationSettings,
  useRoomNotificationSettings,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { ReactNode, Suspense } from "react";
import { Dialog } from "@/primitives/Dialog";
import { Select } from "@/primitives/Select";
import { Spinner } from "@/primitives/Spinner";
import { Switch } from "@/primitives/Switch";
import styles from "./InboxSettingsDialog.module.css";

function RoomNotificationSettings() {
  // Render which thread notifications should be received (for both the inbox, and also in webhooks)
  const [roomSettings, updateRoomSettings] = useRoomNotificationSettings();

  return (
    <div className={styles.selectBox}>
      <Select
        aboveOverlay
        initialValue="replies_and_mentions"
        items={[
          {
            title: "All threads",
            value: "all",
            description: "All comment and thread activity",
          },
          {
            title: "Participating threads",
            value: "replies_and_mentions",
            description:
              "All mentions and replies in threads you're participating in",
          },
          {
            title: "No threads",
            value: "none",
            description: "No thread notifications are received",
          },
        ]}
        onChange={(value) => {
          updateRoomSettings({
            threads: value as any,
          });
        }}
        value={roomSettings.settings.threads}
      />
    </div>
  );
}

function EmailNotificationSettings() {
  // Render settings that change how notifications webhooks are sent
  // These webhooks can be sent on different channels, with different settings for each
  // Below we're just using the email channel, but you could also add slack or teams, for instance
  const [{ settings }, updateSettings] = useNotificationSettings();

  return (
    <div className={styles.switchBox}>
      <Switch
        label="Document invites"
        id="email-invited-to-document"
        disabled={!settings.email}
        checked={settings.email?.$addedToDocument}
        onCheckedChange={() =>
          updateSettings({
            email: {
              $addedToDocument: settings.email
                ? !settings.email.$addedToDocument
                : false,
            },
          })
        }
        justifyBetween
      />
      <Switch
        label="New comments in threads"
        id="email-thread"
        disabled={!settings.email}
        checked={settings.email?.thread}
        onCheckedChange={() =>
          updateSettings({
            email: {
              thread: settings.email ? !settings.email.thread : false,
            },
          })
        }
        justifyBetween
      />
      <Switch
        label="New mentions in text documents"
        id="email-text-mention"
        disabled={!settings.email}
        checked={settings.email?.textMention}
        onCheckedChange={() =>
          updateSettings({
            email: {
              textMention: settings.email ? !settings.email.textMention : false,
            },
          })
        }
        justifyBetween
      />
    </div>
  );
}

export function InboxSettingsDialog({ children }: { children: ReactNode }) {
  const isInsideRoom = useIsInsideRoom();

  return (
    <Dialog
      title="Notification channels"
      content={
        <div className={styles.dialog}>
          <div className={styles.switches}>
            {isInsideRoom ? (
              <>
                <h3>In this document, receive thread notifications for… </h3>
                <Suspense
                  fallback={
                    <div className={clsx(styles.switchBox, styles.loading)}>
                      <Spinner />
                    </div>
                  }
                >
                  <RoomNotificationSettings />
                </Suspense>
              </>
            ) : null}
            <h3>In all documents, receive emails for…</h3>
            <Suspense
              fallback={
                <div className={clsx(styles.switchBox, styles.loading)}>
                  <Spinner />
                </div>
              }
            >
              <EmailNotificationSettings />
            </Suspense>
          </div>
        </div>
      }
    >
      {children}
    </Dialog>
  );
}
