import {
  RoomProvider,
  useMap,
  useRedo,
  useUndo,
  LiveblocksProvider,
} from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import React from "react";
import randomNumber from "../../utils/randomNumber";

const client = createClient({
  authEndpoint: "/api/auth",
  liveblocksServer: process.env.NEXT_PUBLIC_LIVEBLOCKS_SERVER,
});

export default function Home() {
  let roomId = "e2e-storage-map";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId}>
        <Sandbox />
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const map = useMap("map");

  if (map == null) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <h1>useMap sandbox</h1>
      <button
        id="set"
        onClick={() => {
          map.set(`key:${randomNumber(10)}`, `value:${randomNumber(10)}`);
        }}
      >
        Set
      </button>

      <button
        id="delete"
        onClick={() => {
          if (map.size > 0) {
            const index = randomNumber(map.size);
            map.delete(Array.from(map.keys())[index]);
          }
        }}
      >
        Delete
      </button>

      <button
        id="clear"
        onClick={() => {
          while (map.size > 0) {
            map.delete(Array.from(map.keys())[0]);
          }
        }}
      >
        Clear
      </button>

      <button id="undo" onClick={undo}>
        Undo
      </button>

      <button id="redo" onClick={redo}>
        Redo
      </button>

      <h2>Items</h2>
      <p id="itemsCount" style={{ visibility: "hidden" }}>
        {map.size}
      </p>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(Object.fromEntries(map), null, 2)}
      </div>
    </div>
  );
}
