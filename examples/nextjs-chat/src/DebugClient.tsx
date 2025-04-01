"use client";

import { useClient } from "@liveblocks/react";
import { useEffect } from "react";

export function DebugClient() {
  const client = useClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).lbClient = client;
    }
  }, [client]);

  return null;
}
