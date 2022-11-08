import { createRoot } from "react-dom/client";

import { Tabs } from "./components/Tabs";
import {
  ConnectedRoomProvider,
  useConnectedRoomOrNull,
} from "./contexts/ConnectedRoom";
import { Debug } from "./tabs/debug";
import { ThemeProvider } from "./theme";

function Panel() {
  const roomOrNull = useConnectedRoomOrNull();
  if (roomOrNull === null) {
    return (
      <div className="h-full">
        <p className="p-5">No Liveblocks application found.</p>
      </div>
    );
  }

  const room = roomOrNull;
  return (
    <Tabs
      className="h-full"
      defaultValue="debug"
      tabs={[
        {
          value: "debug",
          title: "Debug",
          content: <Debug />,
        },
        {
          value: "storage",
          title: "Storage",
          content: null,
        },
        {
          value: "presence",
          title: "Presence",
          content: null,
        },
        {
          value: "history",
          title: "History",
          content: null,
        },
        {
          value: "events",
          title: "Events",
          content: null,
        },
      ]}
      extra={room.roomId}
    />
  );
}

function PanelApp() {
  return (
    <ThemeProvider>
      <ConnectedRoomProvider>
        <Panel />
      </ConnectedRoomProvider>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<PanelApp />);
