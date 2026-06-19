"use client";

import { useState } from "react";
import { AvatarStack } from "@liveblocks/react-ui";
import { TooltipProvider } from "@/components/ui/tooltip";
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
            <header className="flex items-center justify-between gap-4 border-b px-4 py-2 bg-secondary">
              <div className="flex items-center gap-2">
                <div className="bg-primary border-primary-foreground -ml-px inline-flex size-7 items-center justify-center rounded-md border shadow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="60"
                    height="33"
                    fill="none"
                    viewBox="0 0 60 33"
                    className="text-primary-foreground h-auto w-3.5"
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M40.5 0H0l12 12v16.5zM19.5 33H60L48 21V4.5z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
                <span className="text-sm font-medium tracking-tight">
                  AI Spreadsheet
                </span>
              </div>
              <div className="flex items-center gap-3">
                <AvatarStack size={28} max={5} variant="outline" />
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
