"use client";

import { useRoom } from "@liveblocks/react/suspense";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CellThreadProvider } from "./CellThreadContext";
import { Chat } from "./Chat";
import { SelectionProvider } from "./SelectionContext";
import { Table } from "./Table";
import { Toolbar } from "./Toolbar";

import "handsontable/styles/handsontable.min.css";
import "handsontable/styles/ht-theme-main.min.css";
import "./spreadsheet.css";

/**
 * Handsontable and HyperFormula require a commercial license for commercial use:
 * https://handsontable.com/pricing
 */
export function SpreadsheetEditor() {
  const room = useRoom();
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <SelectionProvider>
        <CellThreadProvider>
          <div className="tw spreadsheet-editor flex h-full min-h-0 flex-col bg-background text-foreground">
            <Toolbar
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((open) => !open)}
            />

            <div className="flex min-h-0 flex-1">
              <div className="relative min-w-0 flex-1">
                <div className="absolute inset-0">
                  <Table />
                </div>
              </div>

              {chatOpen ? (
                <aside className="flex w-[380px] shrink-0 flex-col border-l bg-background">
                  <Chat roomId={room.id} />
                </aside>
              ) : null}
            </div>
          </div>
        </CellThreadProvider>
      </SelectionProvider>
    </TooltipProvider>
  );
}
