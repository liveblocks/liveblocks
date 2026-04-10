"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

export function Providers({ children }: PropsWithChildren) {
  // Try changing the lostConnectionTimeout value to increase
  // or reduct the time it takes to reconnect
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
