import type { IWebSocketCloseEvent } from "@liveblocks/core";
import { LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import { getRoomFromUrl, genRoomId, styles, Row } from "../../utils";

const client = createLiveblocksClient();

const { RoomProvider, useList, useRedo, useSelf, useUndo, useRoom, useStatus } =
  createRoomContext<never, { items: LiveList<string> }>(client);

type Internal = {
  send: {
    explicitClose(event: IWebSocketCloseEvent): void;
    implicitClose(): void;
  };
};

export default function Home() {
  const roomId = getRoomFromUrl() ?? genRoomId("offline");
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

function generateRandomNumber(max: number, ignore?: number) {
  if (max <= 0) {
    throw new Error("max should be more than 0");
  }

  for (let i = 0; i < 300; i++) {
    const n = Math.floor(Math.random() * max);
    if (n !== ignore) {
      return n;
    }
  }

  throw new Error("could not generate a random number after 300 tries");
}

function Sandbox(_props: { roomId: string }) {
  const status = useStatus();
  const room = useRoom();
  const internals = (room as Record<string, unknown>).__internal as Internal;
  const items = useList("items");
  const me = useSelf();
  const undo = useUndo();
  const redo = useRedo();

  if (items == null || me == null) {
    return <div>Loading...</div>;
  }
  room.getStorage();

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
            items.push(me.connectionId + ":" + item);
            item = String.fromCharCode(item.charCodeAt(0) + 1);
          }}
        >
          Push
        </button>

        <button
          id="move"
          disabled={items.length <= 1}
          onClick={() => {
            const index = generateRandomNumber(items.length);
            const target = generateRandomNumber(items.length, index);
            items.move(index, target);
          }}
        >
          Move
        </button>

        <button
          id="delete"
          onClick={() => {
            const index = generateRandomNumber(items.length);
            items.delete(index);
          }}
        >
          Delete
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

        <button id="undo" onClick={undo}>
          Undo
        </button>

        <button id="redo" onClick={redo}>
          Redo
        </button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
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
