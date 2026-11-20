"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";
import { authWithExampleUser } from "@/lib/example";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint={authWithExampleUser("/api/liveblocks-auth")}
      // Optional: point the client at a local Liveblocks dev server
      // (`npx liveblocks dev`). Unset in production.
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      // Resolve user info (name, avatar) from their id. Used by AvatarStack,
      // the editor carets, and any other presence UI.
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
      // Find a list of users that match the current search term, for
      // @-mentions inside the post composer.
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
