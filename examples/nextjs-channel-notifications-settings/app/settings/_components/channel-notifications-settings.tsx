"use client";

import { useState } from "react";
import * as Switch from "@radix-ui/react-switch";
// TODO update import
import { cn } from "../../../emails/_utils/cn";

function SubmitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="submit"
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      Save changes
    </button>
  );
}

export function ChannelNotificationsSettings() {
  // TODO it will be replaced by the new hook
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [$customNotifications, set$customNotifications] = useState(false);

  const handleSubmit = (): void => {
    // TODO CALL update
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
              emailNotifications ? "bg-green-500" : "bg-gray-200"
            )}
            id="emailNotifications"
            name="emailNotifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
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
      <div className="flex justify-end">
        <SubmitButton onClick={handleSubmit} />
      </div>
    </div>
  );
}
