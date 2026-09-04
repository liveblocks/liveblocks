"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";

const STORAGE_SIDEBAR_KEY = "liveblocks-coding-agents:sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_SIDEBAR_KEY) === "collapsed");
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((value) => {
      localStorage.setItem(STORAGE_SIDEBAR_KEY, value ? "open" : "collapsed");
      return !value;
    });
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
