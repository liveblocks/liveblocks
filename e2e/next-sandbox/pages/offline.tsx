import { LiveList } from "@liveblocks/client";
import type { IWebSocketCloseEvent } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import React from "react";

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
import createLiveblocksClient from "../utils/createClient";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useMutation,
  useOthers,
  useRedo,
  useRoom,
  useSelf,
  useStatus,
  useStorage,
  useUndo,
} = createRoomContext<never, { items: LiveList<string> }>(client);

type Internal = {
  simulate: {
    explicitClose(event: IWebSocketCloseEvent): void;
    rawSend(data: string): void;
  };
};

type PrivateRoom = ReturnType<typeof useRoom> & {
  // Private APIs that aren't officially published (yet)
  connect(): void;
  disconnect(): void;
  __internal: Internal;
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
  const room = useRoom() as PrivateRoom;
  const internals = room.__internal;
  const items = useStorage((root) => root.items);
  const me = useSelf();
  const others = useOthers();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const push = useMutation(
    ({ storage }, value: string) => {
      const items = storage.get("items");
      items.push(value);
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

  const delete_ = useMutation(({ storage }, index: number) => {
    const items = storage.get("items");
    items.delete(index);
  }, []);

  const clear = useMutation(({ storage }) => {
    const items = storage.get("items");
    items.clear();
  }, []);

  const canPush = items !== null;
  const canClear = items !== null;
  const canMove = items !== null && items.length >= 2;
  const canDelete = items !== null && items.length > 0;

  const nextValueToPush = padItem(me?.connectionId ?? -1337, item);
  const nextIndicesToMove = canMove ? randomIndices(items) : [-1, -1];
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;

  const numOthers = others.length;

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Offline
      </h3>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="disconnect"
          enabled={status !== "initial"}
          onClick={() => room?.disconnect()}
        >
          Disconnect
        </Button>
        <Button id="reconnect" onClick={() => room?.reconnect()}>
          Reconnect
        </Button>
        <Button
          id="connect"
          enabled={status !== "connected"}
          onClick={() => room?.connect()}
        >
          Connect
        </Button>
      </div>

      <div style={{ margin: "8px 0" }}>
        <div>These should remain connected:</div>

        <div style={{ display: "flex" }}>
          <Button
            id="simulate-navigator-offline"
            onClick={() => window.dispatchEvent(new Event("offline"))}
            title="Simulates a navigator offline event"
          >
            Simulate "navigator offline"
          </Button>
        </div>
      </div>

      <div style={{ margin: "8px 0" }}>
        <div>These should auto-reconnect when they happen:</div>

        <div style={{ display: "flex" }}>
          <Button
            id="close-with-unexpected-condition"
            onClick={() =>
              internals.simulate.explicitClose(
                new CloseEvent("close", { code: 1011, reason: "Abnormal" })
              )
            }
            subtitle="1011 Unexpected condition"
          >
            Close socket
          </Button>

          <Button
            id="close-with-abnormal-reason"
            onClick={() =>
              internals.simulate.explicitClose(
                new CloseEvent("close", {
                  code: 1006,
                  reason: "Abnormal reason",
                })
              )
            }
            subtitle="1006 Abnormal reason"
          >
            Close socket
          </Button>

          <Button
            id="close-with-token-expired"
            onClick={() =>
              internals.simulate.explicitClose(
                new CloseEvent("close", {
                  code: 4109,
                  reason: "Get a new token please",
                })
              )
            }
            subtitle="4109 Token expired"
          >
            Close socket
          </Button>
        </div>
      </div>

      <div style={{ margin: "8px 0" }}>
        <div>These should disconnect permanently when they happen:</div>

        <div style={{ display: "flex" }}>
          <Button
            id="send-invalid-data"
            onClick={() =>
              // Sending an invalid message to the server will
              // force-terminate the connection immediately
              internals.simulate.rawSend("this is not a valid socket message")
            }
          >
            Send invalid data
          </Button>

          <Button
            id="close-with-not-allowed"
            onClick={() =>
              internals.simulate.explicitClose(
                new CloseEvent("close", { code: 4001, reason: "Not allowed" })
              )
            }
            subtitle="4001 Not allowed"
          >
            Close socket
          </Button>

          <Button
            id="close-with-room-full"
            onClick={() =>
              internals.simulate.explicitClose(
                new CloseEvent("close", {
                  code: 4005,
                  reason: "Room is full",
                })
              )
            }
            subtitle="4005 Room full"
          >
            Close socket
          </Button>

          <Button
            id="close-with-dont-retry"
            onClick={() =>
              internals.simulate.explicitClose(
                new CloseEvent("close", { code: 4999, reason: "Stop retrying" })
              )
            }
            subtitle="4999 Don't retry"
          >
            Close socket
          </Button>
        </div>
      </div>
      <hr />

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="push"
          onClick={() => {
            if (!canPush) return;
            push(nextValueToPush);
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
            move(fromIndex, toIndex);
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

        <Button id="clear" enabled={canClear} onClick={clear}>
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
          <Row
            id="connectionId"
            name="Connection ID"
            value={me?.connectionId}
          />
          <Row id="numOthers" name="Others count" value={numOthers} />
          <Row id="numItems" name="Items count" value={items?.length} />
          <Row id="items" name="Items" value={items} />
        </tbody>
      </table>
    </div>
  );
}
