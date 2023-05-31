/* @refresh reload */
import { render } from "solid-js/web";
import { createClient } from "@liveblocks/client";
import { client, PUBLIC_API_KEY } from "../liveblocks.config";
import App from "./App";
import "./index.css";

let roomId = "solidjs-live-avatars";
let PUBLIC_KEY = PUBLIC_API_KEY
overrideApiKeyAndRoomId();


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
  picture: `https://liveblocks.io/avatars/avatar-${Math.floor(
    Math.random() * 30
  )}.png`,
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
