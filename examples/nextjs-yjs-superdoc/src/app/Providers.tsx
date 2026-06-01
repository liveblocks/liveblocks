"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
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
    >
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
