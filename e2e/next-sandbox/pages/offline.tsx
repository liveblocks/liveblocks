import type { IWebSocketCloseEvent } from "@liveblocks/core";
import { LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../utils/createClient";
import {
  getRoomFromUrl,
  opaqueIf,
  padItem,
  randomIndices,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../utils";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useList,
  useRedo,
  useRoom,
  useSelf,
  useStatus,
  useUndo,
} = createRoomContext<never, { items: LiveList<string> }>(client);

type Internal = {
  send: {
    explicitClose(event: IWebSocketCloseEvent): void;
    implicitClose(): void;
  };
};

export default function Home() {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{ items: new LiveList() }}
    >
      <Sandbox roomId={roomId} />
    </RoomProvider>
  );
}

let item = "A";

function Sandbox(_props: { roomId: string }) {
  const renderCount = useRenderCount();
  const status = useStatus();
  const room = useRoom();
  const internals = (room as Record<string, unknown>).__internal as Internal;
  const items = useList("items");
  const me = useSelf();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  if (items == null || me == null) {
    return <div>Loading...</div>;
  }
  room.getStorage();

  const canMove = items.length >= 2;
  const canDelete = items.length > 0;

  const nextValueToPush = padItem(me.connectionId, item);
  const nextIndicesToMove = canMove ? randomIndices(items) : [-1, -1];
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;

  return (
    <div>
      <h1>Offline sandbox</h1>

      <div>
        <button
          id="closeWebsocket"
          onClick={() => {
            internals.send.implicitClose();
          }}
        >
          Close socket
        </button>
        <button
          id="sendCloseEventConnectionError"
          onClick={() =>
            internals.send.explicitClose(
              new CloseEvent("close", {
                reason: "Fake connection error",
                code: 1005,
                wasClean: true,
              })
            )
          }
        >
          Send close event (connection)
        </button>
        <button
          id="sendCloseEventAppError"
          onClick={() =>
            internals.send.explicitClose(
              new CloseEvent("close", {
                reason: "App error",
                code: 4002,
                wasClean: true,
              })
            )
          }
        >
          Send close event (app)
        </button>
      </div>

      <div style={{ margin: "8px 0" }}>
        <button
          id="push"
          onClick={() => {
            items.push(nextValueToPush);
            item = String.fromCharCode(item.charCodeAt(0) + 1);
          }}
        >
          Push ({nextValueToPush.trim()})
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
          Move
          {canMove
            ? ` (${nextIndicesToMove[0]} to ${nextIndicesToMove[1]})`
            : ""}
        </button>

        <button
          id="delete"
          style={opaqueIf(canDelete)}
          onClick={() => {
            if (!canDelete) return;
            items.delete(nextIndexToDelete);
          }}
        >
          Delete
          {canDelete
            ? ` (${nextIndexToDelete}) (${items
                .get(nextIndexToDelete)
                ?.trim()})`
            : ""}
        </button>

        <button
          id="clear"
          onClick={() => {
            while (items.length > 0) {
              items.delete(0);
            }
          }}
        >
          Clear
        </button>

        <button id="undo" style={opaqueIf(canUndo)} onClick={undo}>
          Undo
        </button>

        <button id="redo" style={opaqueIf(canRedo)} onClick={redo}>
          Redo
        </button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row
            id="socketStatus"
            name="WebSocket status"
            value={status}
            style={{ color: status !== "connected" ? "red" : "green" }}
          />
          <Row id="connectionId" name="Connection ID" value={me.connectionId} />
          <Row id="itemsCount" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items.toArray()} />
        </tbody>
      </table>
    </div>
  );
}
