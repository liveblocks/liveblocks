import { LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import React from "react";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../utils";
import Button from "../utils/Button";
import createLiveblocksClient from "../utils/createClient";

const client = createLiveblocksClient();

type Presence = {
  foo?: number;
};

type Storage = {
  items?: LiveList<string>;
};

type PrivateRoom = ReturnType<typeof useRoom> & {
  // Private APIs that aren't officially published (yet)
  connect(): void;
  disconnect(): void;
};

const {
  RoomProvider,
  useList,
  useMyPresence,
  useOthers,
  useSelf,
  useStatus,
  useRoom,
} = createRoomContext<Presence, Storage>(client);

const initialPresence = (): Presence => ({});
const initialStorage = (): Storage => ({ items: new LiveList() });

export default function Home() {
  const [numColumns, setNumColumns] = React.useState(1);
  return (
    <>
      <h3>
        <a href="/">Home</a> › Multiple rooms
      </h3>

      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: numColumns }).map((_, index) => (
          <Column key={index} index={`${index + 1}`} />
        ))}

        <div style={{ backgroundColor: "#c3efef", padding: 20 }}>
          <Button
            id="add-column"
            onClick={() => setNumColumns((n) => n + 1)}
            subtitle="Column"
          >
            Add
          </Button>

          <Button
            id="remove-column"
            onClick={() => setNumColumns((n) => n - 1)}
            subtitle="Column"
          >
            Remove
          </Button>
        </div>
      </div>
    </>
  );
}

type ColumnProps = {
  index: string;
};

function Column({ index }: ColumnProps) {
  return (
    <div style={{ backgroundColor: "#efefef", padding: 20 }}>
      <RoomProviderBlock index={index} />
    </div>
  );
}

type RoomProviderBlockProps = {
  index: string;
};

function RoomProviderBlock({ index }: RoomProviderBlockProps) {
  const [roomId, setRoomId] = React.useState(getRoomFromUrl());
  const [mounted, setMounted] = React.useState(false);
  return (
    <div>
      <input
        id={`input:${index}`}
        value={roomId}
        onChange={(e) => setRoomId(e.currentTarget.value)}
        title={`#input:${index}`}
      />
      <div style={{ display: "flex", margin: "8px 0", gap: 16 }}>
        <div style={{ display: "flex", gap: 2 }}>
          <Button
            id={`mount:${index}`}
            enabled={!mounted}
            onClick={() => setMounted(true)}
          >
            Mount
          </Button>
          <Button
            id={`unmount:${index}`}
            enabled={mounted}
            onClick={() => setMounted(false)}
          >
            Unmount
          </Button>
        </div>
      </div>

      {mounted ? (
        <div style={{ border: "2px solid green" }}>
          <code>
            {"<"}RoomProvider roomId={JSON.stringify(roomId)}
            {">"}
          </code>
          <div style={{ padding: "30px 0 30px 30px" }}>
            <RoomProvider
              id={roomId}
              initialPresence={initialPresence}
              initialStorage={initialStorage}
            >
              <Picker index={index} />
            </RoomProvider>
          </div>
          <code>
            {"</"}RoomProvider{">"}
          </code>
        </div>
      ) : null}
    </div>
  );
}

type PickerProps = {
  index: string;
};

function Picker({ index }: PickerProps) {
  const [nest, setNest] = React.useState(false);
  return nest ? (
    <RoomProviderBlock index={`${index}.1`} />
  ) : (
    <div>
      <div>
        <Button id={`nest:${index}`} onClick={() => setNest(true)}>
          Nest another RoomProvider here
        </Button>
      </div>
      <Sandbox index={index} />
    </div>
  );
}

type SandboxProps = {
  index: string;
};

function Sandbox({ index }: SandboxProps) {
  const renderCount = useRenderCount();
  const socketStatus = useStatus();
  const others = useOthers();
  const items = useList("items");
  const [myPresence, updateMyPresence] = useMyPresence();
  const me = useSelf();
  const theirPresence = others[0]?.presence;
  const room = useRoom() as PrivateRoom;
  return (
    <div>
      <div>
        <Button
          id={`disconnect:${index}`}
          enabled={
            socketStatus !== "initial" && socketStatus !== "disconnected"
          }
          onClick={() => room.disconnect()}
        >
          Disconnect
        </Button>

        <Button id={`reconnect:${index}`} onClick={() => room.reconnect()}>
          Reconnect
        </Button>

        <Button
          id={`connect:${index}`}
          enabled={socketStatus !== "connected"}
          onClick={() => room.connect()}
        >
          Connect
        </Button>
      </div>

      <div>
        <Button
          id={`inc:${index}`}
          onClick={() => {
            updateMyPresence({ foo: (myPresence.foo ?? 0) + 1 });
          }}
        >
          Inc
        </Button>

        <Button
          id={`push:${index}`}
          onClick={() => {
            items?.push("ha");
          }}
        >
          Push
        </Button>

        <Button
          id={`clear:${index}`}
          onClick={() => {
            items?.clear();
          }}
        >
          Clear
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row
            id={`renderCount:${index}`}
            name="Render count"
            value={renderCount}
          />
        </tbody>
      </table>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row
            id={`connectionId:${index}`}
            name="Connection ID"
            value={me?.connectionId}
          />
          <Row
            id={`socketStatus:${index}`}
            name="WebSocket status"
            value={socketStatus}
          />
          <Row
            id={`myPresence:${index}`}
            name="My presence"
            value={myPresence}
          />
          <Row
            id={`theirPresence:${index}`}
            name="Their presence"
            value={theirPresence}
          />
        </tbody>
      </table>

      <h2>Storage</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id={`items:${index}`} name="Items" value={items?.toArray()} />
        </tbody>
      </table>

      <h2>Others</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row
            id={`numOthers:${index}`}
            name="Others count"
            value={others.filter((o) => o.presence !== undefined).length}
          />
          <Row id={`others:${index}`} name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}
