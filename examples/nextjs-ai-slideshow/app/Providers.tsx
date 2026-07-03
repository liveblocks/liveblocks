"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";
import { getRandomUser } from "./database";

const userId = getRandomUser().id;

function authWithRandomUser(endpoint: string) {
  return async (room?: string) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, userId }),
    });

    return await response.json();
  };
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint={authWithRandomUser("/api/liveblocks-auth")}
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
