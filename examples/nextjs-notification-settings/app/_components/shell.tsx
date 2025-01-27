"use client";

import { usePathname } from "next/navigation";

import { NotificationsPopover } from "./notifications-popover";
import { SettingsButton } from "./settings-button";

export function Shell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <main className="text-base bg-background/95 text-foreground flex flex-col w-full min-h-screen">
      <div className="flex flex-row w-full items-center justify-between h-[60px] flex-none px-4 border-b border-border/80 bg-background">
        <div className="flex items-center">
          <h3 className="text-xl font-bold">Liveblocks</h3>
        </div>
        <div className="flex items-center justify-end">
          <NotificationsPopover />
          {pathname !== "/settings" ? <SettingsButton /> : null}
        </div>
      </div>
      {children}
    </main>
  );
}
