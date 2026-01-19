"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren, Suspense } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY as string}
      throttle={16}
      // Try changing the lostConnectionTimeout value to increase
      // or reduct the time it takes to reconnect
      // lostConnectionTimeout={5000}
    >
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
