import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

let roomId = "react-todo-list";

applyExampleRoomId();

const root = createRoot(document.getElementById("root"));
root.render(<App roomId={roomId} />);

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function applyExampleRoomId() {
  if (typeof window === "undefined") {
    return;
  }

  const query = new URLSearchParams(window?.location?.search);
  const exampleId = query.get("exampleId");

  if (exampleId) {
    roomId = exampleId ? `${roomId}-${exampleId}` : roomId;
  }
}
