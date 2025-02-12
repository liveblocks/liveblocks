"use client";

import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, Suspense } from "react";

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

  return (
    <main className="text-base bg-background/95 text-foreground flex flex-col w-full min-h-screen">
      <div className="flex flex-row w-full items-center justify-between h-[60px] flex-none px-4 border-b border-border/80 bg-background">
        <div className="flex items-center">
          <h3 className="text-xl font-bold">Liveblocks</h3>
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
