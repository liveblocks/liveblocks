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
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
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
