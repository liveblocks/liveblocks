import { Room } from "@liveblocks/client";
import {
  RoomProvider,
  useList,
  useRedo,
  useSelf,
  useUndo,
  useRoom,
} from "@liveblocks/react";
import React, { useState } from "react";

type RoomWithDevTools = Room & {
  internalDevTools: {
    closeWebsocket: () => void;
    sendCloseEvent: (event: {
      code: number;
      wasClean: boolean;
      reason: any;
    }) => void;
  };
};

export default function Home() {
  let roomId = "e2e-offline";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <RoomProvider id={roomId}>
      <Sandbox />
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

function Sandbox() {
  const [status, setStatus] = useState("connected");
  const room = useRoom() as RoomWithDevTools;
  const list = useList("items");
  const me = useSelf();
  const undo = useUndo();
  const redo = useRedo();

  if (list == null || me == null) {
    return <div>Loading</div>;
  }
  room.getStorage();

  function onConnectionChange(status: any) {
    if (status === "open") {
      setStatus("connected");
    }
  }

  room.subscribe("connection", onConnectionChange);

  return (
    <div>
      <h1>Storage sandbox- Offline</h1>
      <h2>
        Websocket status:{" "}
        <span style={{ color: status === "offline" ? "red" : "black" }}>
          {status}
        </span>
      </h2>
      <button
        id="closeWebsocket"
        onClick={() => {
          room.internalDevTools.closeWebsocket();
          setStatus("offline");
        }}
      >
        Close socket
      </button>
      <button
        id="sendCloseEventConnectionError"
        onClick={() => {
          room.internalDevTools.sendCloseEvent({
            reason: "Fake connection error",
            code: 1005,
            wasClean: true,
          });
        }}
      >
        Send close event (connection)
      </button>
      <button
        id="sendCloseEventAppError"
        onClick={() => {
          room.internalDevTools.sendCloseEvent({
            reason: "App error",
            code: 4002,
            wasClean: true,
          });
        }}
      >
        Send close event (app)
      </button>

      <button
        id="push"
        onClick={() => {
          list.push(me.connectionId + ":" + item);
          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Push
      </button>

      <button
        id="move"
        onClick={() => {
          const index = generateRandomNumber(list.length);
          const target = generateRandomNumber(list.length, index);
          list.move(index, target);
        }}
      >
        Move
      </button>

      <button
        id="delete"
        onClick={() => {
          const index = generateRandomNumber(list.length);
          list.delete(index);
        }}
      >
        Delete
      </button>

      <button
        id="clear"
        onClick={() => {
          while (list.length > 0) {
            list.delete(0);
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

      <h2>Connection Id</h2>
      <div id="connectionId">{me.connectionId}</div>

      <h2>Items</h2>
      <p id="itemsCount" style={{ visibility: "hidden" }}>
        {list.length}
      </p>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(list.toArray(), null, 2)}
      </div>
    </div>
  );
}
