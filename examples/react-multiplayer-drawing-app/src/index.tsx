import { render } from "react-dom";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

import App from "./App";

import { createClient } from "@liveblocks/client";

const client = createClient({
  publicApiKey: "pk_YOUR_PUBLIC_KEY",
});

const rootElement = document.getElementById("root");
render(
  <LiveblocksProvider client={client}>
    <RoomProvider id="react-multiplayer-drawing-app">
      <App />
    </RoomProvider>
  </LiveblocksProvider>,
  rootElement
);
