"use client";

import { LiveblocksProvider } from "@liveblocks/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      throttle={16}
    >
      {children}
    </LiveblocksProvider>
  );
}
