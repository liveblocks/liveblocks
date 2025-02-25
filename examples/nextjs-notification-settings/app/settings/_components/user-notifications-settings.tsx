"use client";

import type { NotificationChannelSettings } from "@liveblocks/core";
import {
  useNotificationSettings,
  isNotificationChannelEnabled,
} from "@liveblocks/react";

import { Loading } from "@/components/loading";
import { SettingSwitch } from "./setting-switch";

const getAvailableKinds = (settings: NotificationChannelSettings): string => {
  const kinds = Object.keys(settings);
  return kinds.join(", ");
};

export function UserNotificationsSettings() {
  const [{ isLoading, error, settings }, updateNotificationSettings] =
    useNotificationSettings();

  if (isLoading) return <Loading />;
  if (error) throw error; // or throw/capture error

  const isEmailChannelEnabled = isNotificationChannelEnabled(settings.email);
  const isSlackChannelEnabled = isNotificationChannelEnabled(settings.slack);
  const isTeamsChannelEnabled = isNotificationChannelEnabled(settings.teams);
  const isWebPushChannelEnabled = isNotificationChannelEnabled(
    settings.webPush
  );

  const handleChangeEmailChannel = (checked: boolean): void => {
    updateNotificationSettings({
      email: {
        thread: checked,
        textMention: checked,
        $fileUploaded: checked,
      },
    });
  };

  const handleChangeSlackChannel = (checked: boolean): void => {
    updateNotificationSettings({
      slack: {
        thread: checked,
        textMention: checked,
        $fileUploaded: checked,
      },
    });
  };

  const handleChangeTeamsChannel = (checked: boolean): void => {
    updateNotificationSettings({
      teams: {
        thread: checked,
        textMention: checked,
        $fileUploaded: checked,
      },
    });
  };

  const handleChangeWebPushChannel = (checked: boolean): void => {
    updateNotificationSettings({
      webPush: {
        thread: checked,
        textMention: checked,
        $fileUploaded: checked,
      },
    });
  };

  const handleChangeEmailChannelThreadKind = (checked: boolean): void => {
    updateNotificationSettings({
      email: { thread: checked },
    });
  };

  const handleChangeEmailChannelTextMentionKind = (checked: boolean): void => {
    updateNotificationSettings({
      email: {
        textMention: checked,
      },
    });
  };

  const handleChangeEmailChannel$fileUploadedKind = (
    checked: boolean
  ): void => {
    updateNotificationSettings({
      email: {
        $fileUploaded: checked,
      },
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-[600px]">
      {settings.email !== null ? (
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
              onChange={handleChangeEmailChannel}
            >
              Receive Email notifications (all kinds:{" "}
              {getAvailableKinds(settings.email)})
            </SettingSwitch>
            <SettingSwitch
              id="threadNotifications"
              checked={settings.email.thread}
              onChange={handleChangeEmailChannelThreadKind}
            >
              Receive thread kind email notifications
            </SettingSwitch>

            <SettingSwitch
              id="textMentionNotifications"
              checked={settings.email.textMention}
              onChange={handleChangeEmailChannelTextMentionKind}
            >
              Receive text mention kind email notifications
            </SettingSwitch>

            <SettingSwitch
              id="$customNotifications"
              checked={settings.email.$fileUploaded}
              onChange={handleChangeEmailChannel$fileUploadedKind}
            >
              Receive $fileUploaded (custom) kind email notifications
            </SettingSwitch>
          </div>
        </>
      ) : null}

      {settings.slack !== null ? (
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
              onChange={handleChangeSlackChannel}
            >
              Receive Slack notifications (all kinds:{" "}
              {getAvailableKinds(settings.slack)})
            </SettingSwitch>
          </div>
        </>
      ) : null}

      {settings.teams !== null ? (
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
              onChange={handleChangeTeamsChannel}
            >
              Receive Teams notifications (all kinds:{" "}
              {getAvailableKinds(settings.teams)})
            </SettingSwitch>
          </div>
        </>
      ) : null}

      {settings.webPush !== null ? (
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
              onChange={handleChangeWebPushChannel}
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
