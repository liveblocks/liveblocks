import cx from "classnames";
import { createRoot } from "react-dom/client";

import { useRenderCount } from "../hooks/useRenderCount";
import { Tabs } from "./components/Tabs";
import {
  CurrentRoomProvider,
  useCurrentRoomId,
  useRoomIds,
  useSetCurrentRoomId,
  useStatus,
} from "./contexts/CurrentRoom";
import { Debug } from "./tabs/debug";
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
              value: "debug",
              title: "Debug",
              content: <Debug />,
            },
          ]}
        >
          <RoomSelector />
        </Tabs>
      </div>
      <div className="row-span-1 sm:col-span-1 sm:row-auto">
        <Tabs
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

function RoomSelector() {
  const renderCount = useRenderCount();

  const currentRoomId = useCurrentRoomId();
  const setCurrentRoomId = useSetCurrentRoomId();

  const roomIds = useRoomIds();
  const currentStatus = useStatus();
  return (
    <div className="flex space-x-3">
      <span className="text-gray-400">[#{renderCount}]</span>
      {roomIds.map((roomId) => (
        <button key={roomId} onClick={() => setCurrentRoomId(roomId)}>
          {currentRoomId === roomId ? (
            <span className="mr-2 space-x-1 text-xs text-gray-400">
              {currentStatus !== "open" ? <span>{currentStatus}</span> : null}
              <span>
                {currentStatus === "open"
                  ? "🟢"
                  : currentStatus === "closed"
                  ? "⚫️"
                  : currentStatus === "authenticating"
                  ? "🔐"
                  : currentStatus === "connecting"
                  ? "🟠"
                  : "❌"}
              </span>
            </span>
          ) : null}
          <span className={cx({ "font-bold": currentRoomId === roomId })}>
            {roomId}
          </span>
        </button>
      ))}
    </div>
  );
}

function PanelApp() {
  return (
    <ThemeProvider>
      <CurrentRoomProvider>
        <Panel />
      </CurrentRoomProvider>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<PanelApp />);
