import { LiveObject } from "@liveblocks/client";
import { lsonToJson } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";

import {
  getRoomFromUrl,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useMutation,
  useRedo,
  useSelf,
  useStorage,
  useSyncStatus,
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
  const obj = useStorage((root) => root.object);
  const me = useSelf();
  const syncStatus = useSyncStatus();

  const set_ = useMutation(
    ({ storage }, key: string, value: number | LiveObject<{ a: number }>) => {
      const obj = storage.get("object");
      obj.set(key, value);
    },
    []
  );

  const delete_ = useMutation(({ storage }, key: string) => {
    const obj = storage.get("object");
    obj.delete(key);
  }, []);

  const clear = useMutation(({ storage }) => {
    const obj = storage.get("object");
    const keys = Object.keys(obj.toObject());
    let key;
    while ((key = keys.pop()) !== undefined) {
      obj.delete(key);
    }
  }, []);

  if (obj === null || me === null) {
    return <div>Loading...</div>;
  }

  const keys = Object.keys(obj);
  const canDelete = keys.length > 0;

  const nextKey = randomInt(10).toString();
  const nextValue = randomInt(10);
  const nextNestedKey = randomInt(10).toString();
  const nextNestedValue = { a: randomInt(10) };
  const nextKeyToDelete = canDelete ? keys[randomInt(keys.length)] : "";

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveObject
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="set"
          onClick={() => set_(nextKey, nextValue)}
          subtitle={`${JSON.stringify(nextKey)} → ${JSON.stringify(nextValue)}`}
        >
          Set
        </Button>

        <Button
          id="set-nested"
          onClick={() => {
            const nestedLiveObj = new LiveObject(nextNestedValue);
            set_(nextNestedKey, nestedLiveObj);
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
          onClick={() => delete_(nextKeyToDelete)}
          subtitle={canDelete ? `key ${JSON.stringify(nextKeyToDelete)}` : null}
        >
          Delete
        </Button>

        <Button id="clear" onClick={clear}>
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
          <Row
            id="syncStatus"
            name="Sync status (immediate)"
            value={syncStatus}
          />
          <Row id="obj" name="Serialized" value={lsonToJson(obj)} />
        </tbody>
      </table>
    </div>
  );
}
