"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
