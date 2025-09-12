import {
  useIsInsideRoom,
  useNotificationSettings,
  useRoomSubscriptionSettings,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { ReactNode, Suspense } from "react";
import { useInitialDocument } from "@/lib/hooks/useInitialDocument";
import { Dialog } from "@/primitives/Dialog";
import { Select } from "@/primitives/Select";
import { Spinner } from "@/primitives/Spinner";
import { Switch } from "@/primitives/Switch";
import styles from "./InboxSettingsDialog.module.css";

function ThreadsSubscriptionSettings() {
  // Render which notifications should be received (for both the inbox, and also in webhooks)
  const [roomSettings, updateRoomSettings] = useRoomSubscriptionSettings();

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

function TextMentionsSubscriptionSettings() {
  // Render which notifications should be received (for both the inbox, and also in webhooks)
  const [roomSettings, updateRoomSettings] = useRoomSubscriptionSettings();

  return (
    <div className={styles.selectBox}>
      <Select
        aboveOverlay
        initialValue="mine"
        items={[
          {
            title: "Only my mentions",
            value: "mine",
            description: "Only mentions of yourself",
          },
          {
            title: "No mentions",
            value: "none",
            description: "Never be notified of mentions",
          },
        ]}
        onChange={(value) => {
          updateRoomSettings({
            textMentions: value as any,
          });
        }}
        value={roomSettings.settings.textMentions}
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

function RoomSubscriptionSettings() {
  const initialDocument = useInitialDocument();

  return (
    <>
      <h3>In this document, receive thread notifications for… </h3>
      <Suspense
        fallback={
          <div className={clsx(styles.switchBox, styles.loading)}>
            <Spinner />
          </div>
        }
      >
        <ThreadsSubscriptionSettings />
      </Suspense>
      {initialDocument.type === "text" || initialDocument.type === "note" ? (
        <>
          <h3>In this document, receive text mentions notifications for… </h3>
          <Suspense
            fallback={
              <div className={clsx(styles.switchBox, styles.loading)}>
                <Spinner />
              </div>
            }
          >
            <TextMentionsSubscriptionSettings />
          </Suspense>
        </>
      ) : null}
    </>
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
            {isInsideRoom ? <RoomSubscriptionSettings /> : null}
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
