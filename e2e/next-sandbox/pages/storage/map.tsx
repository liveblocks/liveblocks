import { createRoomContext } from "@liveblocks/react";
import { LiveMap } from "@liveblocks/client";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import {
  genRoomId,
  getRoomFromUrl,
  opaqueIf,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";

const client = createLiveblocksClient();

const { RoomProvider, useCanRedo, useCanUndo, useMap, useRedo, useUndo } =
  createRoomContext<never, { map: LiveMap<string, string> }>(client);

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
  const renderCount = useRenderCount();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const map = useMap("map");

  if (map == null) {
    return <div>Loading...</div>;
  }

  const canDelete = map.size > 0;

  const nextKey = `key:${randomInt(10)}`;
  const nextValue = `value:${randomInt(10)}`;
  const nextIndexToDelete = canDelete ? randomInt(map.size) : -1;

  return (
    <div>
      <h1>LiveMap sandbox</h1>
      <button id="set" onClick={() => map.set(nextKey, nextValue)}>
        Set ({JSON.stringify(nextKey)} → {JSON.stringify(nextValue)})
      </button>

      <button
        id="delete"
        style={opaqueIf(canDelete)}
        onClick={() => {
          if (!canDelete) return;
          map.delete(Array.from(map.keys())[nextIndexToDelete]);
        }}
      >
        Delete {canDelete && `(${nextIndexToDelete})`}
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

      <button id="undo" style={opaqueIf(canUndo)} onClick={undo}>
        Undo
      </button>

      <button id="redo" style={opaqueIf(canRedo)} onClick={redo}>
        Redo
      </button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="mapSize" name="Map size" value={map.size} />
          <Row id="map" name="Serialized" value={Object.fromEntries(map)} />
        </tbody>
      </table>
    </div>
  );
}
