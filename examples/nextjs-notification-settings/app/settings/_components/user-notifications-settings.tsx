"use client";

import type { NotificationChannelSettings } from "@liveblocks/core";
import {
  useNotificationSettings,
  isNotificationChannelEnabled,
} from "@liveblocks/react";

import { Loading } from "@/components/loading";
import { SettingSwitch } from "./setting-switch";

// Settings that allow users to choose which notifications are received
// https://liveblocks.io/docs/guides/how-to-create-a-notification-settings-panel

export function UserNotificationsSettings() {
  // Each user has their own notification settings that affects which webhooks
  // are sent for them. This hook allows you to retrieve and edit their settings
  const [{ isLoading, error, settings }, updateNotificationSettings] =
    useNotificationSettings();

  if (isLoading) return <Loading />;
  if (error) throw error; // or throw/capture error

  // Each returns `true` if the current user has every notification kinds enabled on that channel
  const isEmailChannelEnabled = isNotificationChannelEnabled(settings.email);
  const isSlackChannelEnabled = isNotificationChannelEnabled(settings.slack);
  const isTeamsChannelEnabled = isNotificationChannelEnabled(settings.teams);
  const isWebPushChannelEnabled = isNotificationChannelEnabled(
    settings.webPush
  );

  // Each notification kind must first be enabled in the notifications dashboard
  // For example, `settings.email` will be `null` unless at least one Email
  // notification kind is enabled
  // https://liveblocks.io/docs/errors/enable-a-notification-channel
  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-[600px] border">
      {settings.email ? (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
            <p className="text-gray-600 text-sm">
              Choose how you want to receive email notifications.
            </p>
          </div>
          <div className="space-y-6 mb-6">
            <SettingSwitch
              id="emailNotifications"
              checked={isEmailChannelEnabled}
              onChange={(checked: boolean): void => {
                updateNotificationSettings({
                  email: {
                    thread: checked,
                    textMention: checked,
                    $fileUploaded: checked,
                  },
                });
              }}
            >
              Receive Email notifications (all kinds:{" "}
              {getAvailableKinds(settings.email)})
            </SettingSwitch>

            <SettingSwitch
              id="threadNotifications"
              checked={settings.email.thread}
              onChange={(checked: boolean): void => {
                updateNotificationSettings({
                  email: { thread: checked },
                });
              }}
            >
              Receive thread kind email notifications
            </SettingSwitch>

            <SettingSwitch
              id="textMentionNotifications"
              checked={settings.email.textMention}
              onChange={(checked: boolean): void => {
                updateNotificationSettings({
                  email: {
                    textMention: checked,
                  },
                });
              }}
            >
              Receive text mention kind email notifications
            </SettingSwitch>

            <SettingSwitch
              id="$customNotifications"
              checked={settings.email.$fileUploaded}
              onChange={(checked: boolean): void => {
                updateNotificationSettings({
                  email: {
                    $fileUploaded: checked,
                  },
                });
              }}
            >
              Receive $fileUploaded (custom) kind email notifications
            </SettingSwitch>
          </div>
        </>
      ) : null}

      {settings.slack ? (
        <>
          <hr />

          <div className="mb-6 mt-6">
            <h2 className="text-2xl font-bold mb-2">Slack Notifications</h2>
            <p className="text-gray-600 text-sm">
              Choose how you want to receive Slack notifications.
            </p>
          </div>

          <div className="mb-6">
            <SettingSwitch
              id="slackNotifications"
              checked={isSlackChannelEnabled}
              onChange={(checked: boolean): void => {
                updateNotificationSettings({
                  slack: {
                    thread: checked,
                    textMention: checked,
                    $fileUploaded: checked,
                  },
                });
              }}
            >
              Receive Slack notifications (all kinds:{" "}
              {getAvailableKinds(settings.slack)})
            </SettingSwitch>
          </div>
        </>
      ) : null}

      {settings.teams ? (
        <>
          <hr />

          <div className="mb-6 mt-6">
            <h2 className="text-2xl font-bold mb-2">
              Microsoft Teams Notifications
            </h2>
            <p className="text-gray-600 text-sm">
              Choose how you want to receive Microsoft Teams notifications.
            </p>
          </div>

          <div className="mb-6">
            <SettingSwitch
              id="teamsNotifications"
              checked={isTeamsChannelEnabled}
              onChange={(checked: boolean): void => {
                updateNotificationSettings({
                  teams: {
                    thread: checked,
                    textMention: checked,
                    $fileUploaded: checked,
                  },
                });
              }}
            >
              Receive Teams notifications (all kinds:{" "}
              {getAvailableKinds(settings.teams)})
            </SettingSwitch>
          </div>
        </>
      ) : null}

      {settings.webPush ? (
        <>
          <hr />

          <div className="mb-6 mt-6">
            <h2 className="text-2xl font-bold mb-2">Web Push Notifications</h2>
            <p className="text-gray-600 text-sm">
              Choose how you want to receive Web Push notifications.
            </p>
          </div>

          <div className="mb-6 mt-6">
            <SettingSwitch
              id="webPushNotifications"
              checked={isWebPushChannelEnabled}
              onChange={(checked: boolean): void => {
                updateNotificationSettings({
                  webPush: {
                    thread: checked,
                    textMention: checked,
                    $fileUploaded: checked,
                  },
                });
              }}
            >
              Receive web push notifications (all kinds:{" "}
              {getAvailableKinds(settings.webPush)})
            </SettingSwitch>
          </div>
        </>
      ) : null}
    </div>
  );
}

const getAvailableKinds = (settings: NotificationChannelSettings): string => {
  const kinds = Object.keys(settings);
  return kinds.join(", ");
};
