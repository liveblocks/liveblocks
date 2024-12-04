"use client";

import { useState } from "react";
import type { ChannelsNotificationSettings } from "@liveblocks/core";
import { useChannelsNotificationSettings } from "@liveblocks/react";
import * as Switch from "@radix-ui/react-switch";
import { cn } from "../../../utils/cn";

export function ChannelsNotificationsSettings() {
  // TODO: add pre-defined channels
  const [slackNotifications, setSlackNotifications] = useState(false);

  const [{ isLoading, error, settings }, updateChannelNotificationSettings] =
    useChannelsNotificationSettings();

  if (isLoading) return null;
  if (error) return null; // or throw/capture error

  // Make an util here?
  const isEmailChannelEnabled = Object.keys(settings.email).every(
    // @ts-expect-error
    (key) => settings[key] === true
  );

  const handleChangeEmailChannel = (checked: boolean): void => {
    const payload: Partial<ChannelsNotificationSettings> = checked
      ? {
          email: { thread: true, textMention: true, $fileUploaded: true },
        }
      : {
          email: { thread: false, textMention: false, $fileUploaded: false },
        };
    updateChannelNotificationSettings(payload);
  };
  // Thinking of this maybe it would be worth to have a deep partial
  // e.g updateChannelNotificationSettings({ email: { thread: false }})

  const handleChangeThreadKind = (checked: boolean): void => {
    const payload: Partial<ChannelsNotificationSettings> = checked
      ? {
          email: {
            ...settings.email,
            thread: true,
          },
        }
      : {
          email: {
            ...settings.email,
            thread: false,
          },
        };

    updateChannelNotificationSettings(payload);
  };

  const handleChangeTextMentionKind = (checked: boolean): void => {
    const payload: Partial<ChannelsNotificationSettings> = checked
      ? {
          email: {
            ...settings.email,
            textMention: true,
          },
        }
      : {
          email: {
            ...settings.email,
            textMention: false,
          },
        };

    updateChannelNotificationSettings(payload);
  };

  const handleChange$fileUploadedKind = (checked: boolean): void => {
    const payload: Partial<ChannelsNotificationSettings> = checked
      ? {
          email: {
            ...settings.email,
            $fileUploaded: true,
          },
        }
      : {
          email: {
            ...settings.email,
            $fileUploaded: false,
          },
        };

    updateChannelNotificationSettings(payload);
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
            onCheckedChange={handleChangeThreadKind}
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
              settings.email.thread ? "bg-green-500" : "bg-gray-200"
            )}
            id="textMentionNotifications"
            name="textMentionNotifications"
            checked={settings.email.textMention}
            onCheckedChange={handleChangeTextMentionKind}
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
              settings.email ? "bg-green-500" : "bg-gray-200"
            )}
            id="$customNotifications"
            name="$customNotifications"
            checked={settings.email.$fileUploaded}
            onCheckedChange={handleChange$fileUploadedKind}
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
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              slackNotifications ? "bg-green-500" : "bg-gray-200"
            )}
            id="slackNotifications"
            name="slackNotifications"
            checked={slackNotifications}
            onCheckedChange={setSlackNotifications}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="slackNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive Slack notifications
          </label>
        </div>
      </div>
    </div>
  );
}
