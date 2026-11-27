"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";
import { getRandomUser, getUsers } from "./database";

const USER_STORAGE_KEY = "liveblocks-transport-game-user";

// Each browser tab plays as one of the demo users, picked at random and
// remembered across reloads.
function getDemoUserId() {
  const users = getUsers();

  // `examplePreview` is used when deploying an example on liveblocks.io, to
  // give each preview its own user. You can ignore it when running locally.
  const params = new URLSearchParams(window.location.search);
  const examplePreview = params.get("examplePreview");
  if (examplePreview !== null && Number.isInteger(Number(examplePreview))) {
    return users[Math.abs(Number(examplePreview)) % users.length].id;
  }

  try {
    const stored = window.sessionStorage.getItem(USER_STORAGE_KEY);
    if (stored && users.some((user) => user.id === stored)) {
      return stored;
    }
    const userId = getRandomUser().id;
    window.sessionStorage.setItem(USER_STORAGE_KEY, userId);
    return userId;
  } catch {
    return getRandomUser().id;
  }
}

function authWithDemoUser(endpoint: string) {
  let userId: string | null = null;

  return async (room?: string) => {
    userId = userId ?? getDemoUserId();

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
      authEndpoint={authWithDemoUser("/api/liveblocks-auth")}
      // Only used to point the example at a local Liveblocks dev server
      // (https://liveblocks.io/docs/tools/dev-server). Unset in production.
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      // Resolve user info (name, avatar) from their id. Used by AvatarStack
      // to show who's currently playing.
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
