import { createRoomContext } from "@liveblocks/react";
import React from "react";
import {
  getRoomFromUrl,
  opaqueIf,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";
import { LiveObject } from "@liveblocks/client";
import { lsonToJson } from "@liveblocks/core";
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useObject,
  useRedo,
  useSelf,
  useUndo,
} = createRoomContext<
  never,
  {
    object: LiveObject<{
      [key: string]: number | LiveObject<{ a: number }>;
    }>;
  }
>(client);

export default function Home() {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{
        object: new LiveObject<{
          [key: string]: number | LiveObject<{ a: number }>;
        }>(),
      }}
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
  const obj = useObject("object");
  const me = useSelf();

  if (obj == null || me == null) {
    return <div>Loading...</div>;
  }

  const numKeys = Object.keys(obj.toObject()).length;
  const canDelete = numKeys > 0;

  const nextKey = randomInt(10).toString();
  const nextValue = randomInt(10);
  const nextNestedKey = randomInt(10).toString();
  const nextNestedValue = { a: randomInt(10) };
  const nextIndexToDelete = canDelete ? randomInt(numKeys) : -1;

  return (
    <div>
      <h1>LiveObject sandbox</h1>
      <button id="set" onClick={() => obj.set(nextKey, nextValue)}>
        Set ({JSON.stringify(nextKey)} → {JSON.stringify(nextValue)})
      </button>

      <button
        id="set-nested"
        onClick={() => {
          const nestedLiveObj = new LiveObject(nextNestedValue);
          obj.set(nextNestedKey, nestedLiveObj);
        }}
      >
        Set nested ({JSON.stringify(nextNestedKey)} →{" "}
        {JSON.stringify(nextNestedValue)})
      </button>

      <button
        id="delete"
        style={opaqueIf(canDelete)}
        onClick={() => {
          const keys = Object.keys(obj.toObject());
          if (keys.length > 0) {
            obj.delete(keys[nextIndexToDelete]);
          }
        }}
      >
        Delete {canDelete && `(${nextIndexToDelete})`}
      </button>

      <button
        id="clear"
        onClick={() => {
          while (Object.keys(obj.toObject()).length > 0) {
            obj.delete(Array.from(Object.keys(obj.toObject()))[0]);
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
          <Row id="obj" name="Serialized" value={lsonToJson(obj)} />
        </tbody>
      </table>
    </div>
  );
}
