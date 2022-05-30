import {
  RoomProvider,
  useBatch,
  useMap,
  useRedo,
  useSelf,
  useUndo,
  useOthers,
  useMyPresence,
  useStorage,
  LiveblocksProvider,
} from "@liveblocks/react";
import { createClient } from "@liveblocks/client";
import React from "react";

const client = createClient({
  authEndpoint: "/api/auth",
  liveblocksServer: process.env.NEXT_PUBLIC_LIVEBLOCKS_SERVER,
});

export default function Home() {
  let roomId = "e2e-batching-presence-storage";
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

type Presence = {
  count?: number;
};

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const batch = useBatch();
  const liveMap = useMap<string, number>("liveMap");

  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence<Presence>();
  const me = useSelf();

  if (liveMap == null || me == null) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <h1>Storage list sandbox</h1>
      <button
        id="update-storage-presence-batch"
        onClick={() => {
          batch(() => {
            liveMap.set(`user-${me.connectionId}`, 0);
            updateMyPresence({
              count: myPresence.count ? myPresence.count + 1 : 1,
            });
          });
        }}
      >
        Update batch
      </button>

      <button id="undo" onClick={undo}>
        Undo
      </button>

      <button id="redo" onClick={redo}>
        Redo
      </button>

      <button
        id="clear"
        onClick={() => {
          liveMap.forEach((_, key) => {
            liveMap.delete(key);
          });
        }}
      >
        Clear
      </button>

      <h2>Element</h2>
      <p id="itemsCount" style={{ visibility: "hidden" }}>
        {liveMap.size}
      </p>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(Array.from(liveMap.entries()), null, 2)}
      </div>

      <h2>Current user</h2>
      <div>
        Count: <span id="me-count">{myPresence.count}</span>
      </div>

      <h2>Others</h2>
      <div id="others" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(others.toArray(), null, 2)}
      </div>
    </div>
  );
}
