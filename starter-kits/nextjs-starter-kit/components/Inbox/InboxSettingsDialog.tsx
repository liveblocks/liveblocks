import {
  useNotificationSettings,
  useRoomNotificationSettings,
} from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { Dialog } from "@/primitives/Dialog";
import { Select } from "@/primitives/Select";
import { Spinner } from "@/primitives/Spinner";
import { Switch } from "@/primitives/Switch";
import styles from "./InboxSettingsDialog.module.css";

export function InboxSettingsDialog({ children }: { children: ReactNode }) {
  // Render settings that change how notifications webhooks are sent
  // These webhooks can be sent on different channels, with different settings for each
  // Below we're just using the email channel, but you could also add slack or teams, for instance
  const [{ isLoading, settings, error }, updateSettings] =
    useNotificationSettings();

  // Render which thread notifications should be received (for both the inbox, and also in webhooks)
  const [roomSettings, updateRoomSettings] = useRoomNotificationSettings();

  return (
    <Dialog
      title="Notification channels"
      content={
        error ? (
          <div className={styles.dialog}>
            Error fetching notifications settings.
          </div>
        ) : isLoading ? (
          <div className={styles.dialog}>
            <Spinner />
          </div>
        ) : (
          <div className={styles.dialog}>
            <div className={styles.switches}>
              <h3>In this document, receive thread notifications for… </h3>
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
              <h3>In all documents, receive emails for…</h3>
              <div className={styles.switchBox}>
                <Switch
                  label="Document invites"
                  id="email-invited-to-document"
                  checked={settings.email.$addedToDocument}
                  onCheckedChange={() =>
                    updateSettings({
                      email: {
                        $addedToDocument: !settings.email.$addedToDocument,
                      },
                    })
                  }
                  justifyBetween
                />
                <Switch
                  label="New comments in threads"
                  id="email-thread"
                  checked={settings.email.thread}
                  onCheckedChange={() =>
                    updateSettings({
                      email: { thread: !settings.email.thread },
                    })
                  }
                  justifyBetween
                />
                <Switch
                  label="New mentions in text documents"
                  id="email-text-mention"
                  checked={settings.email.textMention}
                  onCheckedChange={() =>
                    updateSettings({
                      email: { textMention: !settings.email.textMention },
                    })
                  }
                  justifyBetween
                />
              </div>
            </div>
          </div>
        )
      }
    >
      {children}
    </Dialog>
  );
}
