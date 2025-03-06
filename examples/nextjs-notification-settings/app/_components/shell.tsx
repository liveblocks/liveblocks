"use client";

import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, Suspense } from "react";
import Link from "next/link";

import { getInitials } from "@/utils/get-initials";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { NotificationsPopover } from "./notifications-popover";
import { SettingsButton } from "./settings-button";
import { EditorButton } from "./editor-button";
import { TriggerCustomNotificationButton } from "./trigger-custom-notification-button";

export function Shell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  // For liveblocks.io/examples, open in new tab because auth doesn't work in iframes
  if (typeof window !== "undefined" && window.self !== window.top) {
    return (
      <div className="bg-white flex justify-center items-center absolute inset-0">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <main className="text-base bg-background/95 text-foreground flex flex-col w-full min-h-screen">
      <div className="flex flex-row w-full items-center justify-between h-[60px] flex-none px-4 border-b border-border/80 bg-background">
        <div className="flex items-center">
          <h3 className="text-xl font-bold">
            <Link href="/">Liveblocks</Link>
          </h3>
        </div>
        {session ? (
          <div className="flex items-center justify-end gap-0.5">
            <NotificationsPopover />

            <Suspense fallback={null}>
              <TriggerCustomNotificationButton
                currentUserId={session.user.info.id}
              />
            </Suspense>

            <Suspense fallback={null}>
              {pathname !== "/settings" ? <SettingsButton /> : <EditorButton />}
            </Suspense>
            <Popover>
              <PopoverTrigger className="ml-2">
                <Avatar className="size-6">
                  <AvatarImage
                    src={session.user.info.picture}
                    alt={session.user.info.name}
                  />
                  <AvatarFallback>
                    {getInitials(session.user.info.name)}
                  </AvatarFallback>
                </Avatar>
              </PopoverTrigger>
              <PopoverContent
                className="flex flex-col w-[320px] gap-1.5 p-2"
                sideOffset={8}
                align="end"
              >
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-lg font-semibold">
                    {session.user.info.name}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {session.user.info.id}
                  </span>
                </div>
                <Separator />
                <Button onClick={handleSignOut}>Sign out</Button>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>
      {children}
    </main>
  );
}
