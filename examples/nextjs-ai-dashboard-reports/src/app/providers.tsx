"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <ThemeProvider
        defaultTheme="system"
        disableTransitionOnChange
        attribute="class"
      >
        <Toaster position="top-right" richColors />
        <NuqsAdapter>{children}</NuqsAdapter>
      </ThemeProvider>
    </LiveblocksProvider>
  );
}
