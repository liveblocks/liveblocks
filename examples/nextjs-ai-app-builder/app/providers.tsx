"use client";

import { ReactNode } from "react";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

// You can wrap your whole app in a LiveblocksProvider
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint={authWithExampleId("/api/liveblocks-auth")}
    >
      {children}
    </LiveblocksProvider>
  );
}

// Not needed, just used to deploy to https://liveblocks.io/examples
function authWithExampleId(endpoint: string) {
  return async (room?: string) => {
    let userId = localStorage.getItem("liveblocks-example-id");
    if (!userId) {
      userId = Math.random().toString(36).substring(2);
      localStorage.setItem("liveblocks-example-id", userId);
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, userId }),
    });
    return await response.json();
  };
}
