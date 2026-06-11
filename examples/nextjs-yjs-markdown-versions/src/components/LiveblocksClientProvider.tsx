"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { ReactNode } from "react";

import { resolveUsers, resolveRoomsInfo } from "@/lib/resolvers-client";

export function LiveblocksClientProvider({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={resolveUsers}
      resolveRoomsInfo={resolveRoomsInfo}
    >
      {children}
    </LiveblocksProvider>
  );
}
