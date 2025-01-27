"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { useExampleUserId } from "../app/use-example-user-id";

export function Providers({ children }: { children?: React.ReactNode }) {
  const userId = useExampleUserId();
  return (
    <LiveblocksProvider
      authEndpoint={`/api/liveblocks-auth${userId ? `?userId=${userId}` : ""}`}
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
      {children}
    </LiveblocksProvider>
  );
}
