"use client";

import { AvatarStack } from "@liveblocks/react-ui";
import { MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLanguage } from "@/lib/languages";
import { getRoomTitle } from "@/lib/room-title";
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
  const language = getLanguage(room.language);

  return (
    <header className="flex h-8 shrink-0 items-center gap-3 pr-2">
      <span className="text-2xl" aria-hidden>
        {language.flag}
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <h1 className="truncate text-sm font-semibold">
          {getRoomTitle(room.members)}
        </h1>
        <p className="truncate text-xs text-neutral-500">{language.name}</p>
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
      </div>
    </header>
  );
}
