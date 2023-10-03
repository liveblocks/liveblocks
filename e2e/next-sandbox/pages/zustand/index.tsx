import React, { useEffect } from "react";
import { create } from "zustand";

import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import createLiveblocksClient from "../../utils/createClient";
import { genRoomId, getRoomFromUrl, styles, Row } from "../../utils";

const client = createLiveblocksClient();

type State = {
  items: string[];
  addItem: (newTodo: string) => void;
  deleteItem: (index: number) => void;
  clear: () => void;
};

const useStore = create<WithLiveblocks<State, never, never, never, never>>()(
  liveblocks(
    (set) => ({
      items: [],
      addItem: (newItem: string) =>
        set((state) => ({
          items: state.items.concat(newItem),
        })),
      deleteItem: (index: number) =>
        set((state) => ({
          items: state.items.filter((_, i) => index != i),
        })),
      clear: () =>
        set(() => ({
          items: [],
        })),
    }),
    { client, storageMapping: { items: true } }
  )
);

export default function Home() {
  const {
    items,
    addItem,
    deleteItem,
    clear,
    liveblocks: { enterRoom, leaveRoom, isStorageLoading, room, others },
  } = useStore();

  const roomId = getRoomFromUrl() ?? genRoomId("e2e-zustand-basic");

  useEffect(() => {
    enterRoom(roomId);
    return () => {
      leaveRoom(roomId);
    };
  }, [enterRoom, leaveRoom]);

  if (isStorageLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Zustand sandbox</h1>
      <button
        id="push"
        onClick={() => {
          addItem(room?.getSelf()?.connectionId + ":" + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Push
      </button>

      <button
        id="delete"
        onClick={() => {
          if (items.length > 0) {
            const index = generateRandomNumber(items.length);
            deleteItem(index);
          }
        }}
      >
        Delete
      </button>

      <button
        id="clear"
        onClick={() => {
          clear();
        }}
      >
        Clear
      </button>

      <button id="undo" onClick={room?.history.undo}>
        Undo
      </button>

      <button id="redo" onClick={room?.history.redo}>
        Redo
      </button>

      <button id="enter" onClick={() => enterRoom(roomId)}>
        Enter room
      </button>

      <button id="leave" onClick={() => leaveRoom(roomId)}>
        Leave room
      </button>

      <h2>Items</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="itemsCount" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items} />
        </tbody>
      </table>

      <h2>Others</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="othersCount" name="Others count" value={others.length} />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
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
