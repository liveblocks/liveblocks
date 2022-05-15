/* @refresh reload */
import { render } from "solid-js/web";
import { createClient } from "@liveblocks/client";
import App from "./App";
import "./index.css";

let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";
let roomId = "solidjs-live-cursors";

overrideApiKeyAndRoomId();

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/solidjs-live-avatars#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const initialPresence = {
  cursor: null
};

const room = client.enter(roomId, { initialPresence });

render(() => <App room={room} />, document.getElementById("root"));

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideApiKeyAndRoomId() {
  const query = new URLSearchParams(window?.location?.search);
  const apiKey = query.get("apiKey");
  const roomIdSuffix = query.get("roomId");

  if (apiKey) {
    PUBLIC_KEY = apiKey;
  }

  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}

