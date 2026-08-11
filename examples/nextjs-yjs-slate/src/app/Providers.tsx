"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren, Suspense } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
