import { createRoomContext } from "@liveblocks/react";
import { LiveList } from "@liveblocks/client";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import {
  genRoomId,
  getRoomFromUrl,
  randomIndices,
  randomInt,
  Row,
  styles,
} from "../../utils";

const client = createLiveblocksClient();

const { RoomProvider, useList, useRedo, useSelf, useUndo } = createRoomContext<
  never,
  { items: LiveList<string> }
>(client);

export default function Home() {
  const roomId = getRoomFromUrl() ?? genRoomId("e2e-storage-list");
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{ items: new LiveList() }}
    >
      <Sandbox />
    </RoomProvider>
  );
}

let item = "A";

function Sandbox() {
  const undo = useUndo();
  const redo = useRedo();
  const items = useList("items");
  const me = useSelf();

  if (items == null || me == null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>LiveList sandbox</h1>
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
        disabled={items.length < 2}
        onClick={() => {
          const [fromIndex, toIndex] = randomIndices(items);
          items.move(fromIndex, toIndex);
        }}
      >
        Move
      </button>

      <button
        id="set"
        disabled={items.length === 0}
        onClick={() => {
          const index = randomInt(items.length - 1);
          items.set(index, me.connectionId + ":" + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Set
      </button>

      <button
        id="delete"
        disabled={items.length === 0}
        onClick={() => {
          const index = randomInt(items.length);
          items.delete(index);
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
