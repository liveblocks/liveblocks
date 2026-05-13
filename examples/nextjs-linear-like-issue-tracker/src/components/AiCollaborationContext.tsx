"use client";

import { createContext, useContext, type ReactNode } from "react";

const AiCollaborationContext = createContext({ aiEnabled: false });

export function AiCollaborationProvider({
  aiEnabled,
  children,
}: {
  aiEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <AiCollaborationContext.Provider value={{ aiEnabled }}>
      {children}
    </AiCollaborationContext.Provider>
  );
}

export function useAiCollaboration() {
  return useContext(AiCollaborationContext);
}
