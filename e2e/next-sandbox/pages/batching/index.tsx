import { LiveMap } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import {
  getRoomFromUrl,
  opaqueIf,
  Row,
  styles,
  useRenderCount,
} from "../../utils";

const client = createLiveblocksClient();

type Presence = {
  count?: number;
};

const {
  RoomProvider,
  useBatch,
  useCanRedo,
  useCanUndo,
  useMap,
  useMyPresence,
  useOthers,
  useRedo,
  useSelf,
  useUndo,
} = createRoomContext<Presence, { liveMap: LiveMap<string, number> }>(client);

export default function Home() {
  const roomId = getRoomFromUrl();
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
  const renderCount = useRenderCount();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const batch = useBatch();
  const liveMap = useMap("liveMap");

  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const theirPresence = others[0]?.presence;
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
              count: (myPresence.count ?? 0) + 1,
            });
          });
        }}
      >
        Batch update (P&amp;S)
      </button>

      <button
        id="clear"
        onClick={() => {
          liveMap.forEach((_, key) => {
            liveMap.delete(key);
          });
        }}
      >
        Clear storage
      </button>

      <button id="undo" style={opaqueIf(canUndo)} onClick={undo}>
        Undo
      </button>

      <button id="redo" style={opaqueIf(canRedo)} onClick={redo}>
        Redo
      </button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
        </tbody>
      </table>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="myPresence" name="My presence" value={myPresence} />
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
        </tbody>
      </table>

      <h2>Storage</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="itemsCount" name="Items count" value={liveMap.size} />
          <Row id="items" name="Items" value={Array.from(liveMap.entries())} />
        </tbody>
      </table>
    </div>
  );
}
