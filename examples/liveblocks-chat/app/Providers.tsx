"use client";

import { ReactNode } from "react";
import { LiveblocksProvider } from "@liveblocks/react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        const params = new URLSearchParams(userIds.map((id) => ["userIds", id]));
        const res = await fetch(`/api/users?${params}`);
        if (!res.ok) {
          throw new Error("Failed to resolve users");
        }
        return res.json();
      }}
      resolveMentionSuggestions={async ({ text }) => {
        const res = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );
        if (!res.ok) {
          throw new Error("Failed to resolve mention suggestions");
        }
        return res.json();
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
