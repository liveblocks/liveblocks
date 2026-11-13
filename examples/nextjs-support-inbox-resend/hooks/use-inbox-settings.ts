"use client";

import { useEffect, useState } from "react";
import type { InboxSettings } from "@/lib/api";

// Whether this deployment is connected to a real Resend inbox.
export function useInboxSettings() {
  const [settings, setSettings] = useState<InboxSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: InboxSettings | null) => {
        if (!cancelled && data) setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
