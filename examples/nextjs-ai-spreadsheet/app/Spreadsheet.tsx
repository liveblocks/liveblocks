"use client";

import { useState } from "react";
import { AvatarStack } from "@liveblocks/react-ui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelpButton } from "@/components/HelpButton";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { NotificationsPopover } from "./NotificationsPopover";
import { SelectionProvider } from "./SelectionContext";
import { CellThreadProvider } from "./CellThreadContext";
import { Toolbar } from "./Toolbar";
import { Table } from "./Table";
import { Chat } from "./Chat";

export function Spreadsheet() {
  const roomId = useExampleRoomId();
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <SelectionProvider>
        <CellThreadProvider>
          <div className="flex h-dvh flex-col bg-background">
            <header className="flex items-center justify-between gap-4 border-b px-4 py-2 bg-emerald-700 text-white">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">
                  AI Spreadsheet
                </span>
                <HelpButton />
              </div>
              <div className="flex items-center gap-3">
                <AvatarStack size={28} max={5} />
                <NotificationsPopover />
              </div>
            </header>

            <Toolbar
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((open) => !open)}
            />

            <div className="flex min-h-0 flex-1">
              <div className="relative min-w-0 flex-1">
                {/* Absolute fill so Handsontable gets a concrete-sized box. */}
                <div className="absolute inset-0">
                  <Table />
                </div>
              </div>
              {chatOpen ? (
                <aside className="flex w-[380px] shrink-0 flex-col border-l">
                  <Chat roomId={roomId} />
                </aside>
              ) : null}
            </div>
          </div>
        </CellThreadProvider>
      </SelectionProvider>
    </TooltipProvider>
  );
}
