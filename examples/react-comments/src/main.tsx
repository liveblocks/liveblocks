import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { LiveblocksProvider } from "@liveblocks/react";

let roomId = "react-comments";

applyExampleRoomId();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LiveblocksProvider
      publicApiKey={import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY}
    >
      <App roomId={roomId} />
    </LiveblocksProvider>
  </React.StrictMode>
);

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
