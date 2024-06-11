"use client";

import type { PropsWithChildren } from "react";
import { LiveblocksProvider } from "@liveblocks/react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // throttle: 100,
    >
      {children}
    </LiveblocksProvider>
  );
}
