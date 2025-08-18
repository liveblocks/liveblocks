import { LiveMap } from "@liveblocks/client";
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
  useStorage,
  useSyncStatus,
  useUndo,
} = createRoomContext<never, { map: LiveMap<string, string> }>(client);

export default function Home() {
  const roomId = getRoomFromUrl();
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
  const syncStatus = useSyncStatus();
  const map = useStorage((root) => root.map);

  const set_ = useMutation(({ storage }, key: string, value: string) => {
    const map = storage.get("map");
    map.set(key, value);
  }, []);

  const delete_ = useMutation(({ storage }, key: string) => {
    const map = storage.get("map");
    map.delete(key);
  }, []);

  const clear = useMutation(({ storage }) => {
    const map = storage.get("map");
    while (map.size > 0) {
      const key = Array.from(map.keys())[0];
      map.delete(key);
    }
  }, []);

  if (map === null) {
    return <div>Loading...</div>;
  }

  const canDelete = map.size > 0;

  const nextKey = `key:${randomInt(10)}`;
  const nextValue = `value:${randomInt(10)}`;

  const keys = Array.from(map.keys());
  const nextKeyToDelete = canDelete ? keys[randomInt(keys.length)] : "";

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveMap
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
          id="delete"
          enabled={canDelete}
          onClick={() => delete_(nextKeyToDelete)}
          subtitle={canDelete ? JSON.stringify(nextKeyToDelete) : null}
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
          <Row id="mapSize" name="Map size" value={map.size} />
          <Row id="map" name="Serialized" value={Object.fromEntries(map)} />
        </tbody>
      </table>
    </div>
  );
}
