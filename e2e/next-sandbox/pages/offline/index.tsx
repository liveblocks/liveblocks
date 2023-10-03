import type { IWebSocketCloseEvent } from "@liveblocks/core";
import { LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import { getRoomFromUrl, genRoomId, styles } from "../../utils";

const client = createLiveblocksClient();

const { RoomProvider, useList, useRedo, useSelf, useUndo, useRoom, useStatus } =
  createRoomContext<never, { items: LiveList<string> }>(client);

const { mono, dataTable } = styles;

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
  let result = 0;
  while (true) {
    result = Math.floor(Math.random() * max);
    if (result !== ignore) {
      return result;
    }
  }
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
      <h1>Storage sandbox - Offline</h1>

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
          // disabled={items.length <= 1}
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

      <table style={dataTable}>
        <tbody>
          <tr>
            <td width="150">WebSocket status</td>
            <td
              id="socketStatus"
              style={{
                ...mono,
                color: status !== "connected" ? "red" : "green",
              }}
            >
              {status}
            </td>
          </tr>
          <tr>
            <td>Connection ID</td>
            <td
              id="connectionId"
              style={{ fontFamily: "monospace", whiteSpace: "pre" }}
            >
              {me.connectionId}
            </td>
          </tr>
          <tr>
            <td>Items count</td>
            <td
              id="itemsCount"
              style={{ fontFamily: "monospace", whiteSpace: "pre" }}
            >
              {items.length}
            </td>
          </tr>
          <tr>
            <td valign="top">Items</td>
            <td
              id="items"
              style={{ fontFamily: "monospace", whiteSpace: "pre" }}
            >
              {JSON.stringify(items.toArray(), null, 2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
