import type { ReactNode } from "react";
import React, { createContext, useState } from "react";


type Version = { id: string, createdAt: Date, authors: string[], data: Uint8Array }

export const VersionContext = createContext<{
  version: Version | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setVersion: (version: Version) => void;
}
>({
  version: null,
  isLoading: false,
  setVersion: (_: Version) => { },
  setIsLoading: (_: boolean) => { },
});

export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<Version | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  return (
    <VersionContext.Provider value={{ version, isLoading, setVersion, setIsLoading }}>
      {children}
    </VersionContext.Provider>
  );
}