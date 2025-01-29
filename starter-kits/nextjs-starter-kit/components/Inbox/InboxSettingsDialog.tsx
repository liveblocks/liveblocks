import { useNotificationSettings } from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { Dialog } from "@/primitives/Dialog";
import { Spinner } from "@/primitives/Spinner";
import { Switch } from "@/primitives/Switch";
import styles from "./InboxSettingsDialog.module.css";

// Render settings that change how notifications webhooks are sent
// These webhooks can be sent on different channels, with different settings for each
// Below we're just using the email channel, but you could also add slack or teams, for instance
export function InboxSettingsDialog({ children }: { children: ReactNode }) {
  const [{ isLoading, settings, error }, updateSettings] =
    useNotificationSettings();

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
              <h3>Emails</h3>
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
