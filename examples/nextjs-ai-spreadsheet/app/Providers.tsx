"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // Resolve user info (name, avatar) from their id. Used by AvatarStack,
      // Comments, and any other presence UI to show who's who.
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
      // Suggest users to @mention when writing a comment.
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
