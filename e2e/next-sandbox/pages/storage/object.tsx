import { LiveObject } from "@liveblocks/client";
import { lsonToJson } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import React from "react";

import {
  getRoomFromUrl,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";
import Button from "../../utils/Button";
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

  if (obj === null || me === null) {
    return <div>Loading...</div>;
  }

  const keys = Object.keys(obj.toObject());
  const canDelete = keys.length > 0;

  const nextKey = randomInt(10).toString();
  const nextValue = randomInt(10);
  const nextNestedKey = randomInt(10).toString();
  const nextNestedValue = { a: randomInt(10) };
  const nextKeyToDelete = canDelete ? keys[randomInt(keys.length)] : -1;

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveObject
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="set"
          onClick={() => obj.set(nextKey, nextValue)}
          subtitle={`${JSON.stringify(nextKey)} → ${JSON.stringify(nextValue)}`}
        >
          Set
        </Button>

        <Button
          id="set-nested"
          onClick={() => {
            const nestedLiveObj = new LiveObject(nextNestedValue);
            obj.set(nextNestedKey, nestedLiveObj);
          }}
          subtitle={`${JSON.stringify(nextNestedKey)} → ${JSON.stringify(
            nextNestedValue
          )}`}
        >
          Set nested
        </Button>

        <Button
          id="delete"
          enabled={canDelete}
          onClick={() => {
            if (!canDelete) return;
            obj.delete(nextKeyToDelete);
          }}
          subtitle={canDelete ? `key ${JSON.stringify(nextKeyToDelete)}` : null}
        >
          Delete
        </Button>

        <Button
          id="clear"
          onClick={() => {
            while (Object.keys(obj.toObject()).length > 0) {
              obj.delete(Array.from(Object.keys(obj.toObject()))[0]);
            }
          }}
        >
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
          <Row id="obj" name="Serialized" value={lsonToJson(obj)} />
        </tbody>
      </table>
    </div>
  );
}
