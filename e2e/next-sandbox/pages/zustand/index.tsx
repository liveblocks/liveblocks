import React, { useEffect } from "react";
import create from "zustand";

import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const client = createClient({
  authEndpoint: "/api/auth",
});

interface State {
  items: string[];
  addItem: (newTodo: string) => void;
  deleteItem: (index: number) => void;
  clear: () => void;
}

const useStore = create(
  middleware<State>(
    (set) => ({
      items: [],
      addItem: (newItem: string) =>
        set((state) => ({
          items: state.items.concat(newItem),
        })),
      deleteItem: (index: number) =>
        set((state) => ({
          items: state.items.filter((item, i) => index != i),
        })),
      clear: () =>
        set((state) => ({
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

  let roomId = "e2e-zustand-basic";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }

  useEffect(() => {
    enterRoom(roomId, {
      items: [],
    });

    return () => {
      leaveRoom(roomId);
    };
  }, [enterRoom, leaveRoom]);

  if (isStorageLoading) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <h1>Storage list sandbox</h1>
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

      <button
        id="enter"
        onClick={() =>
          enterRoom(roomId, {
            items: [],
          })
        }
      >
        Enter room
      </button>

      <button id="leave" onClick={() => leaveRoom(roomId)}>
        Leave room
      </button>

      <h2>Items</h2>
      <p id="itemsCount" style={{ visibility: "hidden" }}>
        {items.length}
      </p>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(items, null, 2)}
      </div>

      <h2>Others</h2>
      <div id="others" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(others, null, 2)}
      </div>
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
