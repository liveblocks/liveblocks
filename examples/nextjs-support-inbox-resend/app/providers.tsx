"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";
import { getUsers } from "./database";

// Picks which support agent this browser tab is. When the example is embedded
// on liveblocks.io, `examplePreview` identifies each preview pane so every
// pane gets a distinct agent; locally a random agent is picked instead. You
// can ignore this completely if you run the example locally.
function pickUserId() {
  const users = getUsers();
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const preview = params?.get("examplePreview");
  const index =
    preview !== null && preview !== undefined && preview !== ""
      ? Number(preview) % users.length
      : Math.floor(Math.random() * users.length);
  return users[index].id;
}

// Resolved once per tab so reconnections keep the same identity.
let userId: string | null = null;

function authWithExampleUser(endpoint: string) {
  return async (room?: string) => {
    userId ??= pickUserId();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, userId }),
    });
    return await response.json();
  };
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint={authWithExampleUser("/api/liveblocks-auth")}
      // Only used to point the example at a local Liveblocks dev server;
      // inert in production.
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      // Resolve agent info (name, avatar, title) from their id. Used for
      // presence avatars, assignees, and note authors.
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
      // Find agents matching what's typed after "@" in an internal note.
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
