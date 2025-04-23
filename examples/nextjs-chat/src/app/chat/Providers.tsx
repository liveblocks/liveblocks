"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      {children}
    </LiveblocksProvider>
  );
}
