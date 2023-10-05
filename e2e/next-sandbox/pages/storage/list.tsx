import { createRoomContext } from "@liveblocks/react";
import { LiveList } from "@liveblocks/client";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import {
  getRoomFromUrl,
  padItem,
  randomIndices,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";
import Button from "../../utils/Button";

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

  const nextValueToPush = padItem(me.connectionId, item);
  const nextValueToInsert = padItem(me.connectionId, item);
  const nextIndexToSet = canSet ? randomInt(items.length) : -1;
  const nextValueToSet = padItem(me.connectionId, item);
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;
  const nextIndicesToMove = canMove ? randomIndices(items) : [-1, -1];

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveList
      </h3>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="push"
          onClick={() => {
            items.push(nextValueToPush);
            item = String.fromCharCode(item.charCodeAt(0) + 1);
          }}
          subtitle={nextValueToPush}
        >
          Push
        </Button>

        <Button
          id="insert"
          onClick={() => {
            items.insert(nextValueToInsert, 0);
            item = String.fromCharCode(item.charCodeAt(0) + 1);
          }}
          subtitle={nextValueToInsert}
        >
          Insert
        </Button>

        <Button
          id="move"
          enabled={canMove}
          onClick={() => {
            if (!canMove) return;
            const [fromIndex, toIndex] = nextIndicesToMove;
            items.move(fromIndex, toIndex);
          }}
          subtitle={
            canMove ? `${nextIndicesToMove[0]} → ${nextIndicesToMove[1]}` : null
          }
        >
          Move
        </Button>

        <Button
          id="set"
          enabled={canSet}
          onClick={() => {
            if (!canSet) return;
            items.set(nextIndexToSet, nextValueToSet);
            item = String.fromCharCode(item.charCodeAt(0) + 1);
          }}
          subtitle={canSet ? `${nextIndexToSet} → ${nextValueToSet}` : null}
        >
          Set
        </Button>

        <Button
          id="delete"
          enabled={canDelete}
          onClick={() => {
            if (!canDelete) return;
            items.delete(nextIndexToDelete);
          }}
          subtitle={
            canDelete
              ? `index ${nextIndexToDelete} (${items
                  .get(nextIndexToDelete)
                  ?.trim()})`
              : null
          }
        >
          Delete
        </Button>

        <Button id="clear" onClick={() => items.clear()}>
          Clear
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
          <Row id="socketStatus" name="WebSocket count" value={status} />
          <Row id="itemsCount" name="List size" value={items.length} />
          <Row id="items" name="Serialized" value={items.toArray()} />
        </tbody>
      </table>
    </div>
  );
}
