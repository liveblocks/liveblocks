import { TooltipProvider } from "@radix-ui/react-tooltip";
import cx from "classnames";
import { createRoot } from "react-dom/client";

import { RoomSelector } from "./components/RoomSelector";
import { RoomStatus } from "./components/RoomStatus";
import { TabView } from "./components/TabView";
import {
  CurrentRoomProvider,
  useCurrentRoomId,
  useRoomIds,
  useSetCurrentRoomId,
  useStatus,
} from "./contexts/CurrentRoom";
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
    <div className="grid h-full grid-rows-3 sm:grid-cols-3 sm:grid-rows-none">
      <div className="row-span-2 border-b border-gray-200 dark:border-gray-600 sm:col-span-2 sm:row-auto sm:border-b-0 sm:border-r">
        <TabView
          className="h-full"
          defaultValue="storage"
          tabs={[
            {
              value: "storage",
              title: "Storage",
              content: <Storage />,
            },
          ]}
          leading={
            <div className="relative flex items-center px-1.5 after:absolute after:-right-px after:top-[20%] after:h-[60%] after:w-px after:bg-gray-200 dark:after:bg-gray-600">
              <RoomStatus />
              <RoomSelector />
            </div>
          }
        />
      </div>
      <div className="row-span-1 sm:col-span-1 sm:row-auto">
        <TabView
          className="h-full"
          defaultValue="presence"
          tabs={[
            {
              value: "presence",
              title: "Presence",
              content: <Presence />,
            },
          ]}
        />
      </div>
    </div>
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
