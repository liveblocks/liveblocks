"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      // @ts-ignore
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      {/* @ts-ignore */}
      {children}
    </LiveblocksProvider>
  );
}
