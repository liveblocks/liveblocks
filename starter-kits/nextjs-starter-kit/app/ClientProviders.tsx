"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
