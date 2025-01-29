"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { LiveblocksProvider } from "@liveblocks/react";
import { ClientSideSuspense } from "@liveblocks/react/suspense";

import { User } from "@/types/data";
import { getUser, searchUsers } from "@/lib/database";

import { Loading } from "./loading";

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
        authEndpoint="/api/liveblocks-auth"
        resolveUsers={async ({ userIds }) => {
          const users = userIds
            .map((userId) => getUser(userId))
            .filter(Boolean) as User[];
          return users.map((user) => ({
            name: user.name,
            color: user.color,
            picture: user.picture,
          }));
        }}
        resolveMentionSuggestions={async ({ text }) => {
          return searchUsers(text);
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          {children}
        </ClientSideSuspense>
      </LiveblocksProvider>
    </SessionProvider>
  );
}
