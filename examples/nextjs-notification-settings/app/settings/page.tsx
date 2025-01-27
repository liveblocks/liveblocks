"use client";

import { UserNotificationsSettings } from "./_components/user-notifications-settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col w-full items-center justify-center h-screen">
      <UserNotificationsSettings />
    </div>
  );
}
