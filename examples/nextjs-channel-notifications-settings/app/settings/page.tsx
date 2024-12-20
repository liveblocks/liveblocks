"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { ChannelsNotificationsSettings } from "./_components/channels-notifications-settings";

export default function SettingsPage() {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // XXX
      // @ts-expect-error
      baseUrl="https://dev.dev-liveblocks5948.workers.dev/"
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        const users = await response.json();
        return users;
      }}
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        const userIds = await response.json();
        return userIds;
      }}
    >
      <div className="flex flex-col w-full items-center justify-center h-screen">
        <ChannelsNotificationsSettings />
      </div>
    </LiveblocksProvider>
  );
}
