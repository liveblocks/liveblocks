import { LiveMap } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

type Presence = {
  count?: number;
};

const {
  RoomProvider,
  useBatch,
  useMap,
  useRedo,
  useSelf,
  useUndo,
  useOthers,
  useMyPresence,
} = createRoomContext<Presence, { liveMap: LiveMap<string, number> }>(client);

export default function Home() {
  let roomId = "e2e-batching-presence-storage";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{ liveMap: new LiveMap() }}
    >
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const batch = useBatch();
  const liveMap = useMap("liveMap");

  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
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
