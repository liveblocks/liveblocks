import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LiveMap } from "@liveblocks/client";
import { RoomProvider } from "./liveblocks.config";
import "./index.css";

let roomId = "react-whiteboard";

overrideRoomId();

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <RoomProvider
      id={roomId}
      initialStorage={{
        shapes: new LiveMap(),
      }}
    >
      <App />
    </RoomProvider>
  </React.StrictMode>
);

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideRoomId() {
  const query = new URLSearchParams(window?.location?.search);
  const roomIdSuffix = query.get("roomId");

  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}
