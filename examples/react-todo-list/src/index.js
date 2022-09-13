import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

let roomId = "react-todo-list";
overrideRoomId();

const root = createRoot(document.getElementById("root"));
root.render(<App roomId={roomId} />);

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
