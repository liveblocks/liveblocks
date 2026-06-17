"use client";

import { useState } from "react";
import { AvatarStack } from "@liveblocks/react-ui";
import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpButton } from "@/components/HelpButton";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { SelectionProvider } from "./SelectionContext";
import { CellThreadProvider } from "./CellThreadContext";
import { CellPresenceProvider } from "./CellPresenceContext";
import { Toolbar } from "./Toolbar";
import { Table } from "./Table";
import { Chat } from "./Chat";

export function Spreadsheet() {
  const roomId = useExampleRoomId();
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <SelectionProvider>
        <CellPresenceProvider>
          <CellThreadProvider>
            <div className="flex h-dvh flex-col bg-background">
              <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight">
                    AI Spreadsheet
                  </span>
                  <HelpButton />
                </div>
                <div className="flex items-center gap-3">
                  <AvatarStack size={28} max={5} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setChatOpen((open) => !open)}
                        aria-label={chatOpen ? "Hide AI chat" : "Show AI chat"}
                        aria-pressed={chatOpen}
                      >
                        {chatOpen ? (
                          <PanelRightCloseIcon className="size-4" />
                        ) : (
                          <PanelRightOpenIcon className="size-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {chatOpen ? "Hide AI chat" : "Show AI chat"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </header>

              <Toolbar />

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
        </CellPresenceProvider>
      </SelectionProvider>
    </TooltipProvider>
  );
}
