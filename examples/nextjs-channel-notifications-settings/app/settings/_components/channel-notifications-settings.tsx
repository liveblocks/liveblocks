"use client";

import { useState } from "react";
import type { ChannelNotificationSettings } from "@liveblocks/core";
import { useChannelNotificationSettings } from "@liveblocks/react";
import * as Switch from "@radix-ui/react-switch";
import { cn } from "../../../utils/cn";

export function ChannelNotificationsSettings() {
  // TODO: add pre-defined channels
  const [slackNotifications, setSlackNotifications] = useState(false);
  // TODO: add augmentation
  const [$customNotifications, set$customNotifications] = useState(false);

  const [{ isLoading, error, settings }, updateChannelNotificationSettings] =
    useChannelNotificationSettings();

  if (isLoading) return null;
  if (error) return null; // or throw/capture error

  // Make an util here?
  const isEmailChannelEnabledFor = Object.keys(settings.email).every(
    // @ts-expect-error
    (key) => settings[key] === true
  );

  const handleChangeEmailChannel = (checked: boolean): void => {
    const payload: ChannelNotificationSettings = checked
      ? {
          email: { thread: true, textMention: true },
        }
      : {
          email: { thread: false, textMention: false },
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
              settings.email ? "bg-green-500" : "bg-gray-200"
            )}
            id="emailNotifications"
            name="emailNotifications"
            checked={isEmailChannelEnabledFor}
            onCheckedChange={handleChangeEmailChannel}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="emailNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive email notifications
          </label>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              slackNotifications ? "bg-green-500" : "bg-gray-200"
            )}
            id="emailNotifications"
            name="emailNotifications"
            checked={slackNotifications}
            onCheckedChange={setSlackNotifications}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="emailNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive Slack notifications
          </label>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-center">
          <Switch.Root
            className={cn(
              "w-11 h-6 rounded-full relative inline-flex items-center transition-colors",
              $customNotifications ? "bg-green-500" : "bg-gray-200"
            )}
            id="emailNotifications"
            name="emailNotifications"
            checked={$customNotifications}
            onCheckedChange={set$customNotifications}
          >
            <Switch.Thumb className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <label
            htmlFor="emailNotifications"
            className="ml-3 text-sm font-medium text-gray-700"
          >
            Receive $customNotifications notifications
          </label>
        </div>
      </div>
    </div>
  );
}
