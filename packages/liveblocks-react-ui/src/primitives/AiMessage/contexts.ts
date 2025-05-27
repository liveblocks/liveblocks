import type { AiOpaqueToolInvocationProps } from "@liveblocks/core";
import { createContext, useContext } from "react";

export const AiToolInvocationContext =
  createContext<AiOpaqueToolInvocationProps | null>(null);

export function useAiToolInvocationContext() {
  const context = useContext(AiToolInvocationContext);

  if (context === null) {
    throw new Error(
      "This component must be used within a tool's render method."
    );
  }

  return context;
}
