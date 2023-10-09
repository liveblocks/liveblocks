import type { IWebSocketCloseEvent } from "@liveblocks/core";
import { LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../utils/createClient";
import {
  getRoomFromUrl,
  padItem,
  randomIndices,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../utils";
import Button from "../utils/Button";

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
  simulate: {
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
      <h3>
        <a href="/">Home</a> › Offline
      </h3>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="closeWebsocket"
          onClick={() => {
            internals.simulate.implicitClose();
          }}
        >
          Close socket
        </Button>
        <Button
          id="sendCloseEventConnectionError"
          onClick={() =>
            internals.simulate.explicitClose(
              new CloseEvent("close", {
                reason: "Fake connection error",
                code: 1005,
                wasClean: true,
              })
            )
          }
        >
          Send close event (connection)
        </Button>
        <Button
          id="sendCloseEventAppError"
          onClick={() =>
            internals.simulate.explicitClose(
              new CloseEvent("close", {
                reason: "App error",
                code: 4002,
                wasClean: true,
              })
            )
          }
        >
          Send close event (app)
        </Button>
      </div>

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

        <Button
          id="clear"
          onClick={() => {
            while (items.length > 0) {
              items.delete(0);
            }
          }}
        >
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
          <Row
            id="socketStatus"
            name="WebSocket status"
            value={status}
            style={{ color: status !== "connected" ? "red" : "green" }}
          />
          <Row id="connectionId" name="Connection ID" value={me.connectionId} />
          <Row id="numItems" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items.toArray()} />
        </tbody>
      </table>
    </div>
  );
}
