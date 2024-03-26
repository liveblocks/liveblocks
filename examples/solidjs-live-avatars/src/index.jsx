/* @refresh reload */
import { render } from "solid-js/web";
import { createClient } from "@liveblocks/client";
import App from "./App";
import "./index.css";

let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";
let roomId = "solidjs-live-avatars";

applyExampleRoomIdAndApiKey();

if (!/^pk_/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/solidjs-live-avatars#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const NAMES = [
  "Charlie Layne",
  "Mislav Abha",
  "Tatum Paolo",
  "Anjali Wanda",
  "Jody Hekla",
  "Emil Joyce",
  "Jory Quispe",
  "Quinn Elton",
];

const initialPresence = {
  name: NAMES[Math.floor(Math.random() * NAMES.length)],
  avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(
    Math.random() * 30
  )}.png`,
};

// If you no longer need the room (for example when you unmount your
// component), make sure to call leave()
const { room, leave } = client.enterRoom(roomId, { initialPresence });

render(() => <App room={room} />, document.getElementById("root"));

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function applyExampleRoomIdAndApiKey() {
  if (typeof window === "undefined") {
    return;
  }

  const query = new URLSearchParams(window?.location?.search);
  const exampleId = query.get("exampleId");
  const apiKey = query.get("apiKey");

  if (exampleId) {
    roomId = exampleId ? `${roomId}-${exampleId}` : roomId;
  }

  if (apiKey) {
    PUBLIC_KEY = apiKey;
  }
}
