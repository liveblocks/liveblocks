"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // @ts-expect-error DEV env for now
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!}
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
  );
}
