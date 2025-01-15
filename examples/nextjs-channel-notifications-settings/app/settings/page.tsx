"use client";

import { Providers } from "../providers";
import { ChannelsNotificationsSettings } from "./_components/channels-notifications-settings";

export default function SettingsPage() {
  return (
    <Providers>
      <div className="flex flex-col w-full items-center justify-center h-screen">
        <ChannelsNotificationsSettings />
      </div>
    </Providers>
  );
}
