"use client";

import { LiveblocksProvider } from "@liveblocks/react";

export function Providers({ children }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // throttle: 100,
    >
      {children}
    </LiveblocksProvider>
  );
}
