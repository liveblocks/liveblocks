import { TooltipProvider } from "@radix-ui/react-tooltip";
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
  const currentRoomId = useCurrentRoomId();

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
            content: <Storage />,
          },
          {
            value: "settings",
            title: "Settings",
            content: null,
            disabled: true,
          },
        ]}
        leading={
          <div className="relative flex flex-none items-center px-1.5 after:absolute after:-right-px after:top-[20%] after:h-[60%] after:w-px after:bg-gray-200 dark:after:bg-gray-600">
            <RoomStatus />
            <RoomSelector />
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
