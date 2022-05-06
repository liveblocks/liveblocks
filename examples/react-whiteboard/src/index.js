import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import "./index.css";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <LiveblocksProvider client={client}>
      <RoomProvider id="react-whiteboard">
        <App />
      </RoomProvider>
    </LiveblocksProvider>
  </React.StrictMode>
);
