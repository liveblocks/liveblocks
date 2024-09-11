"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { authWithRandomUser } from "./example";
import { getRoomInfo } from "./actions/liveblocks";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint={authWithRandomUser("/api/liveblocks-auth")}
      // Get users' info from their ID
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
      // Find a list of users that match the current search term
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
      resolveRoomsInfo={async ({ roomIds }) => {
        const info = await getRoomInfo(roomIds);
        return info;
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
