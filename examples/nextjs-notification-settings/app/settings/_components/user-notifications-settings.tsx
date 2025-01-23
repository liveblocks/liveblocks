"use client";

import {
  useNotificationSettings,
  isNotificationChannelEnabled,
} from "@liveblocks/react";
import * as Switch from "@radix-ui/react-switch";
import { cn } from "../../../utils/cn";

export function UserNotificationsSettings() {
  const [{ isLoading, error, settings }, updateNotificationSettings] =
    useNotificationSettings();

  if (isLoading) return null;
  if (error) return null; // or throw/capture error

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
        <p className="text-gray-600 text-sm">
          Choose how you want to receive email notifications.
        </p>
      </div>
      <div className="mb-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              isEmailChannelEnabled ? "bg-green-500" : "bg-gray-200"
            )}
            id="emailNotifications"
            name="emailNotifications"
            checked={isEmailChannelEnabled}
            onCheckedChange={handleChangeEmailChannel}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="emailNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive email (all kind) notifications
          </label>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              settings.email.thread ? "bg-green-500" : "bg-gray-200"
            )}
            id="threadNotifications"
            name="threadNotifications"
            checked={settings.email.thread}
            onCheckedChange={handleChangeEmailChannelThreadKind}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="threadNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive thread kind email notifications
          </label>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              settings.email.textMention ? "bg-green-500" : "bg-gray-200"
            )}
            id="textMentionNotifications"
            name="textMentionNotifications"
            checked={settings.email.textMention}
            onCheckedChange={handleChangeEmailChannelTextMentionKind}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="textMentionNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive text mention kind email notifications
          </label>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              settings.email.$fileUploaded ? "bg-green-500" : "bg-gray-200"
            )}
            id="$customNotifications"
            name="$customNotifications"
            checked={settings.email.$fileUploaded}
            onCheckedChange={handleChangeEmailChannel$fileUploadedKind}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="$customNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive $fileUploaded (custom) kind notifications
          </label>
        </div>
      </div>

      <hr />

      <div className="mb-6 mt-6">
        <h2 className="text-2xl font-bold mb-2">Slack Notifications</h2>
        <p className="text-gray-600 text-sm">
          Choose how you want to receive Slack notifications.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              isSlackChannelEnabled ? "bg-green-500" : "bg-gray-200"
            )}
            id="slackNotifications"
            name="slackNotifications"
            checked={isSlackChannelEnabled}
            onCheckedChange={handleChangeSlackChannel}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="slackNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive Slack notifications (all kind)
          </label>
        </div>
      </div>

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
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              isTeamsChannelEnabled ? "bg-green-500" : "bg-gray-200"
            )}
            id="teamsNotifications"
            name="teamsNotifications"
            checked={isTeamsChannelEnabled}
            onCheckedChange={handleChangeTeamsChannel}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="teamsNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive Teams notifications (all kind)
          </label>
        </div>
      </div>

      <hr />

      <div className="mb-6 mt-6">
        <h2 className="text-2xl font-bold mb-2">Web Push Notifications</h2>
        <p className="text-gray-600 text-sm">
          Choose how you want to receive Web Push notifications.
        </p>
      </div>

      <div className="mb-6 mt-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              isWebPushChannelEnabled ? "bg-green-500" : "bg-gray-200"
            )}
            id="webPushNotifications"
            name="webPushNotifications"
            checked={isWebPushChannelEnabled}
            onCheckedChange={handleChangeWebPushChannel}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="webPushNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive web push notifications (all kind)
          </label>
        </div>
      </div>
    </div>
  );
}
