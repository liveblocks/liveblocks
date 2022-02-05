import {
  RoomProvider,
  useList,
  useRedo,
  useSelf,
  useUndo,
} from "@liveblocks/react";
import React from "react";

export default function Home() {
  return (
    <RoomProvider id={`e2e-storage-list-${new Date().getTime()}`}>
      <Sandbox />
    </RoomProvider>
  );
}

let item = "A";

function generateRandomNumber(max: number, ignore?: number) {
  let result = 0;
  while (true) {
    result = Math.floor(Math.random() * max);
    if (result !== ignore) {
      return result;
    }
  }
}

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const list = useList("items");
  const me = useSelf();

  if (list == null || me == null) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <h1>Storage list sandbox</h1>
      <button
        id="push"
        onClick={() => {
          list.push(me.connectionId + ":" + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Push
      </button>

      <button
        id="move"
        onClick={() => {
          const index = generateRandomNumber(list.length);
          const target = generateRandomNumber(list.length, index);
          list.move(index, target);
        }}
      >
        Move
      </button>

      <button
        id="delete"
        onClick={() => {
          const index = generateRandomNumber(list.length);
          list.delete(index);
        }}
      >
        Delete
      </button>

      <button
        id="clear"
        onClick={() => {
          while (list.length > 0) {
            list.delete(0);
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
        {JSON.stringify(list.toArray(), null, 2)}
      </div>
    </div>
  );
}
