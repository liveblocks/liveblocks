/* @refresh reload */
import { render } from "solid-js/web";
import { type TypedRoom, client, PUBLIC_API_KEY } from "./liveblocks.config";
import App from "./App";
import "./index.css";

let PUBLIC_KEY = PUBLIC_API_KEY;
let roomId = "solidjs-live-cursors";

overrideApiKeyAndRoomId();

const initialPresence = {
  cursor: null,
};
const room = client.enter(roomId, { initialPresence }) as TypedRoom;

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
