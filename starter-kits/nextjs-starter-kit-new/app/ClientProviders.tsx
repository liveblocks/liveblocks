"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ReactNode } from "react";
import { LiveblocksProvider } from "@/liveblocks.config";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </LiveblocksProvider>
  );
}
