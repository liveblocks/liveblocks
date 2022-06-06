import {
  RoomProvider,
  useList,
  useRedo,
  useSelf,
  useUndo,
  LiveblocksProvider,
} from "@liveblocks/react";
import { LiveList } from "@liveblocks/client";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

export default function Home() {
  let roomId = "e2e-storage-list";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={roomId} initialStorage={{ items: new LiveList() }}>
        <Sandbox />
      </RoomProvider>
    </LiveblocksProvider>
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
        id="insert"
        onClick={() => {
          list.insert(me.connectionId + ":" + item, 0);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Insert
      </button>

      <button
        id="move"
        onClick={() => {
          if (list.length < 2) {
            return;
          }

          const index = generateRandomNumber(list.length);
          const target = generateRandomNumber(list.length, index);
          list.move(index, target);
        }}
      >
        Move
      </button>

      <button
        id="set"
        onClick={() => {
          if (list.length === 0) {
            return;
          }

          const index = generateRandomNumber(list.length - 1);
          list.set(index, me.connectionId + ":" + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Set
      </button>

      <button
        id="delete"
        onClick={() => {
          if (list.length > 0) {
            const index = generateRandomNumber(list.length);
            list.delete(index);
          }
        }}
      >
        Delete
      </button>

      <button id="clear" onClick={() => list.clear()}>
        Clear
      </button>

      <button id="undo" onClick={undo}>
        Undo
      </button>

      <button id="redo" onClick={redo}>
        Redo
      </button>

      <h2>Items</h2>
      <p id="itemsCount" style={{ visibility: "hidden" }}>
        {list.length}
      </p>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(list.toArray(), null, 2)}
      </div>
    </div>
  );
}
