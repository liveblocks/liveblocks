import React from "react";
import ReactDOM from "react-dom";
import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import App from "./App";
import "./index.css";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  throw new Error(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/react-todo-list#getting-started.`
  );
}

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
