"use client";

import { AvatarStack } from "@liveblocks/react-ui";
import { ChevronLeftIcon, MessageSquareIcon } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/app-context";
import { HelpButton } from "@/components/help-button";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { MembersDialog } from "./members-dialog";
import type { RoomShellProps } from "./room-shell";

export function RoomHeader({
  room,
  onRoomChange,
  refreshRoom,
  chatOpen,
  onToggleChat,
}: RoomShellProps & { chatOpen: boolean; onToggleChat: () => void }) {
  const { href } = useApp();
  const language = getLanguage(room.language);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 rounded-lg bg-white px-2 shadow ring-1 ring-neutral-950/5">
      <Button asChild variant="ghost" size="icon-sm" aria-label="Your rooms">
        <Link href={href("/")}>
          <ChevronLeftIcon />
        </Link>
      </Button>
      <span className="text-lg" aria-hidden>
        {language.flag}
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <h1 className="truncate text-sm font-semibold">{room.name}</h1>
        <p className="truncate text-xs text-neutral-500">
          {language.name} · {room.members.length}{" "}
          {room.members.length === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <AvatarStack size={28} max={4} />
        <MembersDialog
          room={room}
          onRoomChange={onRoomChange}
          refreshRoom={refreshRoom}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={chatOpen}
          aria-label={chatOpen ? "Hide chat" : "Show chat"}
          onClick={onToggleChat}
          className={cn(chatOpen && "bg-neutral-100")}
        >
          <MessageSquareIcon />
        </Button>
        <HelpButton />
        <UserMenu />
      </div>
    </header>
  );
}
