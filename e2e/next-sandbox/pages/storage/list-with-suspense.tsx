import { LiveList } from "@liveblocks/client";
import { ClientSideSuspense, createRoomContext } from "@liveblocks/react";
import React from "react";

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
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  suspense: {
    RoomProvider,
    useCanRedo,
    useCanUndo,
    useMutation,
    useRedo,
    useSelf,
    useStorage,
    useUndo,
  },
} = createRoomContext<never, { items: LiveList<string> }>(client);

export default function Home() {
  const roomId = getRoomFromUrl();
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

function Sandbox() {
  const renderCount = useRenderCount();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const items = useStorage((root) => root.items);
  const me = useSelf();

  const push = useMutation(
    ({ storage }, value: string) => {
      const items = storage.get("items");
      items.push(value);
      item = String.fromCharCode(item.charCodeAt(0) + 1);
    },
    [item]
  );

  const insert = useMutation(
    ({ storage }, index: number, value: string) => {
      const items = storage.get("items");
      items.insert(value, index);
      item = String.fromCharCode(item.charCodeAt(0) + 1);
    },
    [item]
  );

  const move = useMutation(
    ({ storage }, fromIndex: number, toIndex: number) => {
      const items = storage.get("items");
      items.move(fromIndex, toIndex);
    },
    []
  );

  const set_ = useMutation(
    ({ storage }, index: number, value: string) => {
      const items = storage.get("items");
      items.set(index, value);
      item = String.fromCharCode(item.charCodeAt(0) + 1);
    },
    [item]
  );

  const delete_ = useMutation(({ storage }, index: number) => {
    const items = storage.get("items");
    items.delete(index);
  }, []);

  const clear = useMutation(({ storage }) => {
    const items = storage.get("items");
    items.clear();
  }, []);

  const canDelete = items.length > 0;
  const canSet = items.length > 0;
  const canMove = items.length > 2;

  const nextValueToPush = padItem(me.connectionId, item);
  const nextValueToInsert = padItem(me.connectionId, item);
  const nextIndexToSet = canSet ? randomInt(items.length) : -1;
  const nextValueToSet = padItem(me.connectionId, item);
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;
  const nextIndicesToMove = canMove ? randomIndices(items) : [-1, -1];

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveList (with Suspense)
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="push"
          onClick={() => push(nextValueToPush)}
          subtitle={nextValueToPush}
        >
          Push
        </Button>

        <Button
          id="insert"
          onClick={() => insert(0, nextValueToInsert)}
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
            move(fromIndex, toIndex);
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
            set_(nextIndexToSet, nextValueToSet);
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
            delete_(nextIndexToDelete);
          }}
          subtitle={
            canDelete
              ? `index ${nextIndexToDelete} (${items[
                  nextIndexToDelete
                ].trim()})`
              : null
          }
        >
          Delete
        </Button>

        <Button id="clear" onClick={clear}>
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
          <Row id="numItems" name="List size" value={items.length} />
          <Row id="items" name="Serialized" value={items} />
        </tbody>
      </table>
    </div>
  );
}
