import { createRoomContext, ClientSideSuspense } from "@liveblocks/react";
import { LiveList } from "@liveblocks/client";
import React from "react";
import { genRoomId, getRoomFromUrl, styles, Row } from "../../utils";
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  suspense: { RoomProvider, useList, useRedo, useSelf, useUndo },
} = createRoomContext<never, { items: LiveList<string> }>(client);

export default function Home() {
  const roomId = getRoomFromUrl() ?? genRoomId("e2e-storage-with-suspense");
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{ items: new LiveList() }}
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        {() => <Sandbox />}
      </ClientSideSuspense>
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
  const items = useList("items");
  const me = useSelf();

  return (
    <div>
      <h1>LiveList sandbox (with suspense)</h1>
      <button
        id="push"
        onClick={() => {
          items.push(me.connectionId + ":" + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Push
      </button>

      <button
        id="insert"
        onClick={() => {
          items.insert(me.connectionId + ":" + item, 0);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Insert
      </button>

      <button
        id="move"
        onClick={() => {
          if (items.length < 2) {
            return;
          }

          const index = generateRandomNumber(items.length);
          const target = generateRandomNumber(items.length, index);
          items.move(index, target);
        }}
      >
        Move
      </button>

      <button
        id="set"
        onClick={() => {
          if (items.length === 0) {
            return;
          }

          const index = generateRandomNumber(items.length - 1);
          items.set(index, me.connectionId + ":" + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Set
      </button>

      <button
        id="delete"
        onClick={() => {
          if (items.length > 0) {
            const index = generateRandomNumber(items.length);
            items.delete(index);
          }
        }}
      >
        Delete
      </button>

      <button id="clear" onClick={() => items.clear()}>
        Clear
      </button>

      <button id="undo" onClick={undo}>
        Undo
      </button>

      <button id="redo" onClick={redo}>
        Redo
      </button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="itemsCount" name="List size" value={items.length} />
          <Row id="items" name="Serialized" value={items.toArray()} />
        </tbody>
      </table>
    </div>
  );
}
