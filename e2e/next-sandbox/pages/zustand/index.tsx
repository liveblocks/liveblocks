import React, { useEffect } from "react";
import { create } from "zustand";

import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import createLiveblocksClient from "../../utils/createClient";
import {
  getRoomFromUrl,
  opaqueIf,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";

const client = createLiveblocksClient();

type State = {
  // Presence
  name: string;
  counter: number;

  // Storage
  items: string[];

  // Mutations
  setName: (newName: string) => void;
  incCounter: () => void;
  addItem: (newTodo: string) => void;
  deleteItem: (index: number) => void;
  clear: () => void;
};

const useStore = create<WithLiveblocks<State, never, never, never, never>>()(
  liveblocks(
    (set) => ({
      // Presence
      name: "",
      counter: 0,

      // Storage
      items: [],

      setName: (newName: string) => set(() => ({ name: newName })),
      incCounter: () => set((state) => ({ counter: state.counter + 1 })),
      addItem: (newItem: string) =>
        set((state) => ({ items: state.items.concat(newItem) })),
      deleteItem: (index: number) =>
        set((state) => ({ items: state.items.filter((_, i) => index != i) })),
      clear: () => set(() => ({ items: [] })),
    }),
    {
      client,
      storageMapping: { items: true },
      presenceMapping: { name: true, counter: true },
    }
  )
);

export default function ZustandApp() {
  const renderCount = useRenderCount();
  const {
    items,
    setName,
    incCounter,
    addItem,
    deleteItem,
    clear,
    liveblocks: { enterRoom, leaveRoom, isStorageLoading, room, others },
  } = useStore();

  const connectionId = room?.getSelf()?.connectionId ?? 0;
  const sep = [":", "/"];
  const prefix = `${connectionId} ${sep[connectionId % sep.length]} `;

  const roomId = getRoomFromUrl();

  useEffect(() => {
    enterRoom(roomId);
    return () => {
      leaveRoom(roomId);
    };
  }, [enterRoom, leaveRoom]);

  if (isStorageLoading) {
    return <div>Loading...</div>;
  }

  const theirPresence = others[0]?.presence;

  const canDelete = items.length > 0;
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;

  return (
    <div>
      <h1>Zustand sandbox</h1>
      <button id="set-name" onClick={() => setName("Vincent")}>
        Set name
      </button>

      <button id="inc-counter" onClick={() => incCounter()}>
        Inc counter
      </button>

      <button
        id="push"
        onClick={() => {
          addItem(prefix + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Push ({prefix + item})
      </button>

      <button
        id="delete"
        style={opaqueIf(canDelete)}
        onClick={() => {
          if (!canDelete) return;
          deleteItem(nextIndexToDelete);
        }}
      >
        Delete{" "}
        {canDelete &&
          `(${nextIndexToDelete}) (${JSON.stringify(
            items[nextIndexToDelete]
          )})`}
      </button>

      <button id="clear" onClick={() => clear()}>
        Clear
      </button>

      <button
        id="undo"
        style={opaqueIf(room?.history.canUndo() ?? false)}
        onClick={room?.history.undo}
      >
        Undo
      </button>

      <button
        id="redo"
        style={opaqueIf(room?.history.canRedo() ?? false)}
        onClick={room?.history.redo}
      >
        Redo
      </button>

      <button
        id="enter"
        style={opaqueIf(room === null)}
        onClick={() => enterRoom(roomId)}
      >
        Enter room
      </button>

      <button
        id="leave"
        style={opaqueIf(room !== null)}
        onClick={() => leaveRoom(roomId)}
      >
        Leave room
      </button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
        </tbody>
      </table>

      <h2>Items</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="itemsCount" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items} />
        </tbody>
      </table>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="connectionId" name="Connection ID" value={connectionId} />
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
          <Row id="othersCount" name="Others count" value={others.length} />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}

let item = "A";
