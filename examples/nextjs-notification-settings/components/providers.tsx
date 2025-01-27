"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { LiveblocksProvider } from "@liveblocks/react";

export function Providers({
  session,
  children,
}: {
  session: Session | null;
  children?: React.ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <LiveblocksProvider
        throttle={16}
        authEndpoint={`/api/liveblocks-auth`}
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
    </SessionProvider>
  );
}
