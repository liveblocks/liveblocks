"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren, Suspense } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      authEndpoint="/api/liveblocks-auth"
      throttle={16}
    >
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
