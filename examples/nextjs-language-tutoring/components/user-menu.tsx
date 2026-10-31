"use client";

import { LogOutIcon } from "lucide-react";
import { useApp, useCurrentUser } from "./app-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { UserAvatar } from "./user-avatar";

export function UserMenu() {
  const user = useCurrentUser();
  const { isPreview, signOut } = useApp();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-full p-0 leading-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Account"
      >
        <UserAvatar info={user.info} size={32} className="ring-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserAvatar info={user.info} size={28} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">
              {user.info.name}
            </span>
            <span className="truncate text-xs font-normal text-neutral-500">
              {user.id}
            </span>
          </span>
        </DropdownMenuLabel>
        {!isPreview ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
