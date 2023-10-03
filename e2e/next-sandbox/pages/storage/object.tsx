import { createRoomContext } from "@liveblocks/react";
import randomNumber from "../../utils/randomNumber";
import React from "react";
import { genRoomId, getRoomFromUrl, styles, Row } from "../../utils";
import { LiveObject } from "@liveblocks/client";
import { lsonToJson } from "@liveblocks/core";
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

const { RoomProvider, useObject, useRedo, useSelf, useUndo } =
  createRoomContext<
    never,
    {
      object: LiveObject<{
        [key: string]: number | LiveObject<{ a: number }>;
      }>;
    }
  >(client);

export default function Home() {
  const roomId = getRoomFromUrl() ?? genRoomId("e2e-storage-object");
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
  const undo = useUndo();
  const redo = useRedo();
  const obj = useObject("object");
  const me = useSelf();

  if (obj == null || me == null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>LiveObject sandbox</h1>
      <button
        id="set"
        onClick={() => {
          obj.set(randomNumber(10).toString(), randomNumber(10));
        }}
      >
        Set
      </button>

      <button
        id="set-nested"
        onClick={() => {
          const nestedLiveObj = new LiveObject({ a: randomNumber(10) });
          obj.set(randomNumber(10).toString(), nestedLiveObj);
        }}
      >
        Set nested
      </button>

      <button
        id="delete"
        onClick={() => {
          const keys = Object.keys(obj.toObject());
          if (keys.length > 0) {
            const index = randomNumber(keys.length);
            obj.delete(keys[index]);
          }
        }}
      >
        Delete
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

      <button id="undo" onClick={undo}>
        Undo
      </button>

      <button id="redo" onClick={redo}>
        Redo
      </button>

      <table style={styles.dataTable}>
        <tbody>
          {/* XXX Rename ID to obj! */}
          <Row id="items" name="Serialized" value={lsonToJson(obj)} />
        </tbody>
      </table>
    </div>
  );
}
