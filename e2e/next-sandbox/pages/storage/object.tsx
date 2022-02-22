import {
  RoomProvider,
  useObject,
  useRedo,
  useSelf,
  useUndo,
} from "@liveblocks/react";
import randomNumber from "../../utils/randomNumber";
import React from "react";

export default function Home() {
  let roomId = "e2e-storage-object";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <RoomProvider id={roomId}>
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const object = useObject<{ [key: string]: number }>("object");
  const me = useSelf();

  if (object == null || me == null) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <h1>Storage object sandbox</h1>
      <button
        id="set"
        onClick={() => {
          object.set(randomNumber(10).toString(), randomNumber(10));
        }}
      >
        Set
      </button>

      <button
        id="delete"
        onClick={() => {
          const keys = Object.keys(object.toObject());
          if (keys.length > 0) {
            const index = randomNumber(keys.length);
            object.delete(keys[index]);
          }
        }}
      >
        Delete
      </button>

      <button
        id="clear"
        onClick={() => {
          while (Object.keys(object.toObject()).length > 0) {
            object.delete(Array.from(Object.keys(object.toObject()))[0]);
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

      <h2>Items</h2>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(object.toObject(), null, 2)}
      </div>
    </div>
  );
}
