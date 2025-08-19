import { createLiveblocksContext } from "@liveblocks/react";
import type { WithLiveblocks } from "@liveblocks/zustand";
import { liveblocks } from "@liveblocks/zustand";
import { useEffect } from "react";
import { create } from "zustand";

import {
  getRoomFromUrl,
  padItem,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../utils";
import Button from "../utils/Button";
import { createLiveblocksClient } from "../utils/createClient";

const client = createLiveblocksClient();

const { useSyncStatus } = createLiveblocksContext(client);

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
        set((state) => ({ items: state.items.filter((_, i) => index !== i) })),
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
  const syncStatus = useSyncStatus();

  const connectionId = room?.getSelf()?.connectionId ?? 0;

  const roomId = getRoomFromUrl();

  useEffect(() => {
    return enterRoom(roomId);
  }, [roomId, enterRoom]);

  if (isStorageLoading) {
    return <div>Loading...</div>;
  }

  const theirPresence = others[0]?.presence;

  const canDelete = items.length > 0;
  const nextValueToPush = padItem(connectionId, item);
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Zustand
      </h3>

      <div style={{ display: "flex" }}>
        <Button id="set-name" onClick={() => setName("Vincent")}>
          Set name
        </Button>

        <Button id="inc-counter" onClick={() => incCounter()}>
          Inc counter
        </Button>

        <Button
          id="enter"
          enabled={room === null}
          onClick={() => enterRoom(roomId)}
        >
          Enter room
        </Button>

        <Button id="leave" enabled={room !== null} onClick={() => leaveRoom()}>
          Leave room
        </Button>
      </div>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="push"
          onClick={() => {
            addItem(nextValueToPush);
            item = String.fromCharCode(item.charCodeAt(0) + 1);
          }}
          subtitle={nextValueToPush}
        >
          Push
        </Button>

        <Button
          id="delete"
          enabled={canDelete}
          onClick={() => deleteItem(nextIndexToDelete)}
          subtitle={
            canDelete
              ? `index ${nextIndexToDelete} (${items[
                  nextIndexToDelete
                ].trim()})`
              : null
          }
        >
          Delete{" "}
        </Button>

        <Button id="clear" onClick={() => clear()}>
          Clear
        </Button>

        <Button
          id="undo"
          enabled={room?.history.canUndo() ?? false}
          onClick={room?.history.undo}
        >
          Undo
        </Button>

        <Button
          id="redo"
          enabled={room?.history.canRedo() ?? false}
          onClick={room?.history.redo}
        >
          Redo
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="syncStatus" name="Sync status" value={syncStatus} />
          <Row id="connectionId" name="Connection ID" value={connectionId} />
        </tbody>
      </table>

      <h2>Storage</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="numItems" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items} />
        </tbody>
      </table>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
          <Row id="numOthers" name="Others count" value={others.length} />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}

let item = "A";
