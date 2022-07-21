import React from "react";
import ReactDOM from "react-dom";
import { LiveList } from "@liveblocks/client";
import { RoomProvider } from "./liveblocks.config";
import App from "./App";
import "./index.css";

let roomId = "react-todo-list";

overrideRoomId();

ReactDOM.render(
  <React.StrictMode>
    <RoomProvider
      id={roomId}
      initialStorage={{
        todos: new LiveList(),
      }}
    >
      <App />
    </RoomProvider>
  </React.StrictMode>,
  document.getElementById("root")
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
