import React from "react";
import ReactDOM from "react-dom";
import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import App from "./App";
import "./index.css";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

ReactDOM.render(
  <React.StrictMode>
    <LiveblocksProvider client={client}>
      <RoomProvider id="react-todo-list">
        <App />
      </RoomProvider>
    </LiveblocksProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
