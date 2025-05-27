"use client";

import { ReactNode } from "react";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

// You can wrap your whole app in a LiveblocksProvider
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // @ts-expect-error DEV env for now
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!}
    >
      {children}
    </LiveblocksProvider>
  );
}
