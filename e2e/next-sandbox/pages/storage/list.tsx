import { createRoomContext } from "@liveblocks/react";
import { LiveList } from "@liveblocks/client";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import {
  getRoomFromUrl,
  opaqueIf,
  randomIndices,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useList,
  useRedo,
  useSelf,
  useStatus,
  useUndo,
} = createRoomContext<never, { items: LiveList<string> }>(client);

export default function Home() {
  const roomId = getRoomFromUrl();
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
  const renderCount = useRenderCount();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const items = useList("items");
  const me = useSelf();
  const status = useStatus();

  if (items == null || me == null) {
    return <div>Loading...</div>;
  }

  const canDelete = items.length > 0;
  const canMove = items.length >= 2;
  const canSet = items.length > 0;

  const nextIndexToSet = canSet ? randomInt(items.length) : -1;
  const nextValueToSet = me.connectionId + ":" + item;
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;
  const nextIndicesToMove = canMove ? randomIndices(items) : [-1, -1];

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
        Push ({item})
      </button>

      <button
        id="insert"
        onClick={() => {
          items.insert(me.connectionId + ":" + item, 0);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Insert ({item}, 0)
      </button>

      <button
        id="move"
        style={opaqueIf(canMove)}
        onClick={() => {
          if (!canMove) return;
          const [fromIndex, toIndex] = nextIndicesToMove;
          items.move(fromIndex, toIndex);
        }}
      >
        Move{" "}
        {canMove && ` (${nextIndicesToMove[0]} to ${nextIndicesToMove[1]})`}
      </button>

      <button
        id="set"
        style={opaqueIf(canSet)}
        onClick={() => {
          if (!canSet) return;
          items.set(nextIndexToSet, nextValueToSet);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Set{" "}
        {canSet && ` (${nextIndexToSet} → ${JSON.stringify(nextValueToSet)})`}
      </button>

      <button
        id="delete"
        style={opaqueIf(canDelete)}
        onClick={() => {
          if (!canDelete) return;
          items.delete(nextIndexToDelete);
        }}
      >
        Delete {canDelete && ` (${nextIndexToDelete})`}
      </button>

      <button id="clear" onClick={() => items.clear()}>
        Clear
      </button>

      <button id="undo" style={opaqueIf(canUndo)} onClick={undo}>
        Undo
      </button>

      <button id="redo" style={opaqueIf(canRedo)} onClick={redo}>
        Redo
      </button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="socketStatus" name="WebSocket count" value={status} />
          <Row id="itemsCount" name="List size" value={items.length} />
          <Row id="items" name="Serialized" value={items.toArray()} />
        </tbody>
      </table>
    </div>
  );
}
