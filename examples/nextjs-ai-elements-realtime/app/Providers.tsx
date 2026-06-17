"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // Resolve user info (name, avatar) from their id. Used by AvatarStack and
      // any other presence UI to show who's currently in the room.
      resolveUsers={async ({ userIds }) => {
        const search = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${search}`);
        if (!response.ok) {
          throw new Error("Problem resolving users");
        }
        return await response.json();
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
