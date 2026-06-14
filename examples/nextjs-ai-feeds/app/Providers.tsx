"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider authEndpoint={authWithExampleId("/api/liveblocks-auth")}>
      {children}
    </LiveblocksProvider>
  );
}

// This function adds a stable random user id when deploying on liveblocks.io.
// You can replace it with `authEndpoint="/api/liveblocks-auth"` when running
// the example locally.
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
