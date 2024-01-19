import { LiveMap } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../utils";
import Button from "../utils/Button";
import createLiveblocksClient from "../utils/createClient";

const client = createLiveblocksClient();

type Presence = {
  count?: number;
};

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useMutation,
  useOthers,
  useRedo,
  useSelf,
  useStorage,
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
  const liveMap = useStorage((root) => root.liveMap);

  const others = useOthers();
  const theirPresence = others[0]?.presence;
  const me = useSelf();

  const batchUpdate = useMutation(({ storage, self, setMyPresence }) => {
    storage.get("liveMap").set(`user-${self.connectionId}`, 0);
    setMyPresence({
      count: (self.presence.count ?? 0) + 1,
    });
  }, []);

  const clear = useMutation(({ storage }) => {
    const liveMap = storage.get("liveMap");
    liveMap.forEach((_, key) => {
      liveMap.delete(key);
    });
  }, []);

  if (liveMap === null || me === null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Batching
      </h3>
      <div style={{ display: "flex" }}>
        <Button
          id="update-storage-presence-batch"
          onClick={batchUpdate}
          subtitle="Presence & Storage"
        >
          Batch update
        </Button>

        <Button id="clear" onClick={clear} subtitle="Storage only">
          Clear
        </Button>

        <Button id="undo" enabled={canUndo} onClick={undo}>
          Undo
        </Button>

        <Button id="redo" enabled={canRedo} onClick={redo}>
          Redo
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
        </tbody>
      </table>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="myPresence" name="My presence" value={me.presence} />
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
        </tbody>
      </table>

      <h2>Storage</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="numItems" name="Items count" value={liveMap.size} />
          <Row id="items" name="Items" value={Array.from(liveMap.entries())} />
        </tbody>
      </table>
    </div>
  );
}
