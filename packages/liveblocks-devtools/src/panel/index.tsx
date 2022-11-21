import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ChangeEvent } from "react";
import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

import { ResizablePanel } from "./components/ResizablePanel";
import { RoomSelector } from "./components/RoomSelector";
import { RoomStatus } from "./components/RoomStatus";
import { Tabs } from "./components/Tabs";
import { CurrentRoomProvider, useCurrentRoomId } from "./contexts/CurrentRoom";
import { Presence } from "./tabs/presence";
import { Storage } from "./tabs/storage";
import { ThemeProvider } from "./theme";

function Panel() {
  const [search, setSearch] = useState("");
  const currentRoomId = useCurrentRoomId();

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value),
    []
  );

  if (currentRoomId === null) {
    return (
      <div className="h-full">
        <p className="p-5">No Liveblocks application found.</p>
      </div>
    );
  }

  return (
    <ResizablePanel
      content={
        <Tabs
          className="h-full"
          defaultValue="presence"
          tabs={[
            {
              value: "presence",
              title: "Presence",
              content: <Presence />,
            },
            {
              value: "history",
              title: "History",
              content: null,
              disabled: true,
            },
            {
              value: "events",
              title: "Events",
              content: null,
              disabled: true,
            },
          ]}
        />
      }
    >
      <Tabs
        className="h-full"
        defaultValue="storage"
        tabs={[
          {
            value: "storage",
            title: "Storage",
            content: <Storage search={search} />,
          },
          {
            value: "settings",
            title: "Settings",
            content: null,
            disabled: true,
          },
        ]}
        leading={
          <div className="relative flex flex-none items-center px-1.5">
            <RoomStatus />
            <RoomSelector />
            <div className="bg-light-300 dark:bg-dark-300 absolute -right-px top-[20%] h-[60%] w-px" />
          </div>
        }
        trailing={
          <div className="relative flex w-[30%] min-w-[140px] flex-none items-center">
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search properties…"
              className="text-dark-0 dark:text-light-0 placeholder:text-dark-600 dark:placeholder:text-light-600 absolute inset-0 bg-transparent pl-7 pt-px pr-2.5 text-xs placeholder:opacity-50"
            />
            <svg
              width="16"
              height="16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-1.5 -translate-y-px translate-x-px opacity-50"
            >
              <path
                d="M7.25 12a4.75 4.75 0 1 0 0-9.5 4.75 4.75 0 0 0 0 9.5ZM13.25 13.25 11 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="bg-light-300 dark:bg-dark-300 absolute -left-px top-[20%] h-[60%] w-px" />
          </div>
        }
      />
    </ResizablePanel>
  );
}

function PanelApp() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <CurrentRoomProvider>
          <Panel />
        </CurrentRoomProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<PanelApp />);
