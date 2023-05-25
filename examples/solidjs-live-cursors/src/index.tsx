/* @refresh reload */
import { render } from "solid-js/web";
import { createClient } from "@liveblocks/client";
import { type TypedRoom } from "./liveblocks.config";
import App from "./App";
import "./index.css";

let PUBLIC_KEY = "pk_dev_cGhHV46MCR_vLLDFpeT37x4pLmR2WvS_MGqTO1rhUdimBrKHx9AHjasXV6m7Aoy7";
let roomId = "solidjs-live-cursors";

overrideApiKeyAndRoomId();

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/solidjs-live-cursors#getting-started.`,
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const initialPresence = {
  cursor: null,
};
const room = client.enter(roomId, { initialPresence }) as TypedRoom
// const room: TypedRoom = client.enter(roomId, { initialPresence });
// const room = client.enter<TypedRoom>(roomId, { initialPresence });
// const room = client.enter<{},{},{},{}>(roomId, { initialPresence });

render(() => <App room={room}/>, document.getElementById("root"));

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

