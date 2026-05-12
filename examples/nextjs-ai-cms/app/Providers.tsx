"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { ReactNode, Suspense } from "react";
import { authWithRandomUser } from "./example";
import { getRoomsInfoForProvider } from "./actions/liveblocks";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint={authWithRandomUser("/api/liveblocks-auth")}
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        return await response.json();
      }}
      resolveRoomsInfo={async ({ roomIds }) => {
        return await getRoomsInfoForProvider(roomIds);
      }}
    >
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
