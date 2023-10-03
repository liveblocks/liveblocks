import { LiveMap } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import { genRoomId, getRoomFromUrl, styles, Row } from "../../utils";

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
  const roomId = getRoomFromUrl() ?? genRoomId("e2e-batching-presence-storage");
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
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Batching sandbox</h1>
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
      <table style={styles.dataTable}>
        <tbody>
          <Row id="itemsCount" name="Items count" value={liveMap.size} />
          <Row id="items" name="Items" value={Array.from(liveMap.entries())} />
        </tbody>
      </table>

      <h2>Me</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="me-count" name="Count" value={myPresence.count} />
        </tbody>
      </table>

      <h2>Others</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}
