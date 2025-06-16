"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import { InvitedUsersProvider } from "@/lib/useInvitedUsers";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <InvitedUsersProvider>
      <LiveblocksProvider
        authEndpoint={authWithExampleId("/api/liveblocks-auth")}
      >
        <SWRConfig
          value={{
            refreshInterval: 3000,
            fetcher: (resource, init) =>
              fetch(resource, init).then((res) => res.json()),
          }}
        >
          <ThemeProvider
            defaultTheme="system"
            disableTransitionOnChange
            attribute="class"
          >
            <Toaster position="top-right" richColors />
            <NuqsAdapter>{children}</NuqsAdapter>
          </ThemeProvider>
        </SWRConfig>
      </LiveblocksProvider>
    </InvitedUsersProvider>
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
