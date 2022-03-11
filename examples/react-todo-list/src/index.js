import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";

import { createClient } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

// Replace this key with your public key provided at https://liveblocks.io/dashboard/apikeys
const PUBLIC_KEY = "pk_xxxxxxx";

if (PUBLIC_KEY.startsWith("pk_xxxxxxx")) {
  throw new Error(
    "Replace the above constant PUBLIC_KEY with your own Liveblocks public key."
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

ReactDOM.render(
  <React.StrictMode>
    <LiveblocksProvider client={client}>
      <RoomProvider id="react-todo-app">
        <App />
      </RoomProvider>
    </LiveblocksProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
