import { createRoomContext } from "@liveblocks/react";
import { LiveMap } from "@liveblocks/client";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import { genRoomId, getRoomFromUrl, randomInt, Row, styles } from "../../utils";

const client = createLiveblocksClient();

const { RoomProvider, useMap, useRedo, useUndo } = createRoomContext<
  never,
  { map: LiveMap<string, string> }
>(client);

export default function Home() {
  const roomId = getRoomFromUrl() ?? genRoomId("e2e-storage-map");
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{ map: new LiveMap<string, string>() }}
    >
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const map = useMap("map");

  if (map == null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>LiveMap sandbox</h1>
      <button
        id="set"
        onClick={() => {
          map.set(`key:${randomInt(10)}`, `value:${randomInt(10)}`);
        }}
      >
        Set
      </button>

      <button
        id="delete"
        onClick={() => {
          if (map.size > 0) {
            const index = randomInt(map.size);
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

      <table style={styles.dataTable}>
        <tbody>
          {/* XXX Rename ID to map-size! */}
          <Row id="itemsCount" name="Map size" value={map.size} />
          {/* XXX Rename ID to map! */}
          <Row id="items" name="Serialized" value={Object.fromEntries(map)} />
        </tbody>
      </table>
    </div>
  );
}
