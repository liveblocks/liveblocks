import { RoomProvider, useList, useSelf } from "@liveblocks/react";
import React from "react";

export default function Home() {
  return (
    <RoomProvider id="e2e-storage-list">
      <Sandbox />
    </RoomProvider>
  );
}

let item = "A";

function generateRandomNumber(min: number, max: number, ignore?: number) {
  let result = 0;
  while (true) {
    result = Math.floor(Math.random() * max);
    if (result !== ignore) {
      return result;
    }
  }
}

function Sandbox() {
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
          console.clear();
        }}
      >
        Push
      </button>

      <button
        id="move"
        onClick={() => {
          const index = generateRandomNumber(0, list.length);
          const target = generateRandomNumber(0, list.length, index);
          console.log("MOVE", index, target);
          list.move(index, target);
        }}
      >
        Move
      </button>

      <button
        id="delete"
        onClick={() => {
          const index = generateRandomNumber(0, list.length);
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

      <h2>Items</h2>
      <div id="items">{JSON.stringify(list.toArray(), null, 2)}</div>
    </div>
  );
}
