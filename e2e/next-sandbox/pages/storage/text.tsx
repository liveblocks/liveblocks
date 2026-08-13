import { LiveText } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useMutation,
  useRedo,
  useRoom,
  useSelf,
  useStatus,
  useStorage,
  useSyncStatus,
  useUndo,
} = createRoomContext<never, { text: LiveText }>(client);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Incremental edits that walk "Hello, world!" → "Lorem ipsum dolor sit amet.",
// one op per step, so an offline client has many intervening versions to rebase
// against when it reconnects.
const MORPH_STEPS: ((text: LiveText) => void)[] = [
  (text) => text.replace(0, 5, "Lorem"), // "Lorem, world!"
  (text) => text.replace(5, 2, " "), // "Lorem world!"
  (text) => text.replace(6, 6, "ipsum"), // "Lorem ipsum"
  (text) => text.insert(11, " dolor"), // "Lorem ipsum dolor"
  (text) => text.insert(17, " sit"), // "Lorem ipsum dolor sit"
  (text) => text.insert(21, " amet"), // "Lorem ipsum dolor sit amet"
  (text) => text.insert(26, "."), // "Lorem ipsum dolor sit amet."
];

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
  const room = useRoom();
  const status = useStatus();
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

  // Set the doc to "Hello, world!" with "world!" bold, the starting point of
  // the offline-rebase scenario.
  const setupScenario = useMutation(({ storage }) => {
    const text = storage.get("text");
    text.replace(0, text.length, "Hello, world!");
    text.format(7, 6, { bold: true });
  }, []);

  // Client A's offline edit: delete ", world" → "Hello!".
  const deleteCommaWorld = useMutation(({ storage }) => {
    storage.get("text").delete(5, 7);
  }, []);

  const applyMorphStep = useMutation(
    ({ storage }, step: (text: LiveText) => void) => {
      step(storage.get("text"));
    },
    []
  );

  // Walk "Hello, world!" → "Lorem ipsum dolor sit amet." one op at a time, with
  // a pause between each so the version climbs visibly.
  const morphToLorem = async () => {
    for (const step of MORPH_STEPS) {
      applyMorphStep(step);
      await sleep(600);
    }
  };

  if (text === null || me === null) {
    return <div>Loading...</div>;
  }

  const plainText = text.map(([segmentText]) => segmentText).join("");

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

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id="setupScenario" onClick={setupScenario}>
          Setup "Hello, world!"
        </Button>
        <Button id="deleteCommaWorld" onClick={deleteCommaWorld}>
          Delete Index 5-7
        </Button>
        <Button id="morphToLorem" onClick={() => void morphToLorem()}>
          Morph → "Lorem ipsum…"
        </Button>
      </div>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="disconnect"
          enabled={status !== "initial"}
          onClick={() => room.disconnect()}
        >
          Disconnect
        </Button>
        <Button id="reconnect" onClick={() => room.reconnect()}>
          Reconnect
        </Button>
        <Button
          id="connect"
          enabled={status !== "connected"}
          onClick={() => room.connect()}
        >
          Connect
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="status" name="Connection status" value={status} />
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
