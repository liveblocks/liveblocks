import cx from "classnames";
import { createRoot } from "react-dom/client";

import { useRenderCount } from "../hooks/useRenderCount";
import { Tabs } from "./components/Tabs";
import {
  RoomMirrorProvider,
  useCurrentRoomOrNull,
  useRoomsContext,
} from "./contexts/RoomMirror";
import { Debug } from "./tabs/debug";
import { Presence } from "./tabs/presence";
import { Storage } from "./tabs/storage";
import { ThemeProvider } from "./theme";

function Panel() {
  const renderCount = useRenderCount();

  // XXX Clean up these accesses
  const allRooms = Array.from(useRoomsContext().allRooms.keys());
  const setCurrentRoomId = useRoomsContext().setCurrentRoomId;
  const roomOrNull = useCurrentRoomOrNull();
  if (roomOrNull === null) {
    return (
      <div className="h-full">
        <p className="p-5">No Liveblocks application found.</p>
      </div>
    );
  }

  const room = roomOrNull;

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
          <div className="flex space-x-3">
            <span className="text-gray-400">[#{renderCount}]</span>
            {allRooms.map((r) => (
              <button
                key={r}
                className={cx({ "font-bold": room.roomId === r })}
                onClick={() => setCurrentRoomId(r)}
              >
                {r}
              </button>
            ))}
          </div>
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

function PanelApp() {
  return (
    <ThemeProvider>
      <RoomMirrorProvider>
        <Panel />
      </RoomMirrorProvider>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<PanelApp />);
