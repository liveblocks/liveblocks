import {
  RoomProvider,
  useObject,
  useRedo,
  useSelf,
  useUndo,
} from "@liveblocks/react";
import React from "react";

export default function Home() {
  return (
    <RoomProvider id="e2e-storage-object">
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const object = useObject<{ a: number }>("object");
  const me = useSelf();

  if (object == null || me == null) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <h1>Storage object sandbox</h1>
      <button
        id="set-a"
        onClick={() => {
          object.set("a", Math.floor(Math.random() * 100));
        }}
      >
        Set A
      </button>

      <button
        id="delete-a"
        onClick={() => {
          object.delete("a");
        }}
      >
        Delete A
      </button>

      <button id="undo" onClick={undo}>
        Undo
      </button>

      <button id="redo" onClick={redo}>
        Redo
      </button>

      <h2>Items</h2>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(object.toObject(), null, 2)}
      </div>
    </div>
  );
}
