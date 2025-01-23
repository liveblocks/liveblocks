"use client";

import { Providers } from "../providers";
import { UserNotificationsSettings } from "./_components/user-notifications-settings";

export default function SettingsPage() {
  return (
    <Providers>
      <div className="flex flex-col w-full items-center justify-center h-screen">
        <UserNotificationsSettings />
      </div>
    </Providers>
  );
}
