"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { LiveblocksProvider } from "@liveblocks/react";

import { getUser, searchUsers } from "@/lib/database";

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
        // XXX
        // @ts-expect-error
        baseUrl="https://dev.dev-liveblocks5948.workers.dev/"
        resolveUsers={async ({ userIds }) => {
          return userIds.map((userId) => getUser(userId)).filter(Boolean);
        }}
        resolveMentionSuggestions={async ({ text }) => {
          return searchUsers(text);
        }}
      >
        {children}
      </LiveblocksProvider>
    </SessionProvider>
  );
}
