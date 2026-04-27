import { LiveText } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

import {
  getRoomFromUrl,
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
} = createRoomContext<never, { text: LiveText }>(client);

export default function Home() {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{ text: new LiveText("Hello") }}
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
  const text = useStorage((root) => root.text);
  const me = useSelf();
  const syncStatus = useSyncStatus();

  const insert = useMutation(({ storage }, value: string) => {
    storage.get("text").insert(storage.get("text").length, value);
  }, []);

  const formatHello = useMutation(({ storage }) => {
    storage.get("text").format(0, 5, { bold: true });
  }, []);

  const unformatHello = useMutation(({ storage }) => {
    storage.get("text").format(0, 5, { bold: null });
  }, []);

  const deleteFirst = useMutation(({ storage }) => {
    storage.get("text").delete(0, 1);
  }, []);

  const reset = useMutation(({ storage }) => {
    const text = storage.get("text");
    text.replace(0, text.length, "Hello");
  }, []);

  if (text === null || me === null) {
    return <div>Loading...</div>;
  }

  const plainText = text.map((item) => item.insert).join("");

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveText
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id="insert" onClick={() => insert(" world")}>
          Insert
        </Button>
        <Button id="format" onClick={formatHello}>
          Format
        </Button>
        <Button id="unformat" onClick={unformatHello}>
          Unformat
        </Button>
        <Button id="delete" onClick={deleteFirst}>
          Delete first
        </Button>
        <Button id="reset" onClick={reset}>
          Reset
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
          <Row id="plainText" name="Plain text" value={plainText} />
          <Row id="text" name="Serialized" value={text} />
        </tbody>
      </table>
    </div>
  );
}
