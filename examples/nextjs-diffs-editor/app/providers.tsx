"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";
import { getRandomUser, getUsers } from "./database";

/**
 * Picks the demo user for this browser tab. `examplePreview` is set when the
 * example is embedded on liveblocks.io so each preview pane gets a distinct
 * user; you can ignore it when running the example locally.
 */
function getDemoUserId() {
  if (typeof window !== "undefined") {
    const preview = new URLSearchParams(window.location.search).get(
      "examplePreview"
    );
    if (preview !== null) {
      const users = getUsers();
      return users[Number(preview) % users.length].id;
    }
  }
  return getRandomUser().id;
}

const userId = getDemoUserId();

function authWithUser(endpoint: string) {
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
      throttle={16}
      authEndpoint={authWithUser("/api/liveblocks-auth")}
      // Used when testing against a self-hosted/local Liveblocks server.
      // Ignore otherwise; this is undefined in production.
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      // Resolve user info (name, avatar, color) from their id. Used by the
      // avatar stack and the live carets to show who's in the room.
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
      // Find a list of users that match the current search term.
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        return await response.json();
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
