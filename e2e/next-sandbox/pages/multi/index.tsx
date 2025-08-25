import { LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { useState } from "react";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient();

type Presence = {
  foo?: number;
};

type Storage = {
  initialRoom: string;
  items?: LiveList<string>;
};

const {
  RoomProvider,
  useStorage,
  useMutation,
  useMyPresence,
  useOthers,
  useSelf,
  useStatus,
  useRoom,
} = createRoomContext<Presence, Storage>(client);

const initialPresence = (): Presence => ({});
const initialStorageForRoom = (roomId: string) => (): Storage => ({
  initialRoom: roomId,
  items: new LiveList([]),
});

export default function Home() {
  const [numColumns, setNumColumns] = useState(1);
  return (
    <>
      <h3 style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span>
          <a href="/">Home</a> › Multiple rooms
        </span>
        <span>
          <Button id="logout" onClick={() => client.logout()}>
            Logout
          </Button>
        </span>
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
  const [roomId, setRoomId] = useState(getRoomFromUrl());
  const [mounted, setMounted] = useState(false);
  return (
    <div>
      <input
        id={`input_${index}`}
        value={roomId}
        onChange={(e) => setRoomId(e.currentTarget.value)}
        title={`#input_${index}`}
      />
      <div style={{ display: "flex", margin: "8px 0", gap: 16 }}>
        <div style={{ display: "flex", gap: 2 }}>
          <Button
            id={`mount_${index}`}
            enabled={!mounted}
            onClick={() => setMounted(true)}
          >
            Mount
          </Button>
          <Button
            id={`unmount_${index}`}
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
              initialStorage={initialStorageForRoom(roomId)}
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
  const [nest, setNest] = useState(false);
  return nest ? (
    <RoomProviderBlock index={`${index}_1`} />
  ) : (
    <div>
      <div>
        <Button id={`nest_${index}`} onClick={() => setNest(true)}>
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
  const initialRoom = useStorage((root) => root.initialRoom);
  const items = useStorage((root) => root.items);
  const push = useMutation(
    ({ storage }, value: string) => storage.get("items")?.push(value),
    []
  );
  const clear = useMutation(({ storage }) => {
    storage.delete("initialRoom");
    storage.get("items")?.clear();
  }, []);
  const [myPresence, updateMyPresence] = useMyPresence();
  const me = useSelf();
  const theirPresence = others[0]?.presence;
  const room = useRoom();
  return (
    <div>
      <div>
        <Button
          id={`disconnect_${index}`}
          enabled={
            socketStatus !== "initial" && socketStatus !== "disconnected"
          }
          onClick={() => room.disconnect()}
        >
          Disconnect
        </Button>

        <Button id={`reconnect_${index}`} onClick={() => room.reconnect()}>
          Reconnect
        </Button>

        <Button
          id={`connect_${index}`}
          enabled={socketStatus !== "connected"}
          onClick={() => room.connect()}
        >
          Connect
        </Button>
      </div>

      <div>
        <Button
          id={`inc_${index}`}
          onClick={() => {
            updateMyPresence({ foo: (myPresence.foo ?? 0) + 1 });
          }}
        >
          Inc
        </Button>

        <Button id={`push_${index}`} onClick={() => push("ha")}>
          Push
        </Button>

        <Button id={`clear_${index}`} onClick={clear}>
          Clear
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row
            id={`renderCount_${index}`}
            name="Render count"
            value={renderCount}
          />
        </tbody>
      </table>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row
            id={`connectionId_${index}`}
            name="Connection ID"
            value={me?.connectionId}
          />
          <Row
            id={`socketStatus_${index}`}
            name="WebSocket status"
            value={socketStatus}
          />
          <Row
            id={`myPresence_${index}`}
            name="My presence"
            value={myPresence}
          />
          <Row
            id={`theirPresence_${index}`}
            name="Their presence"
            value={theirPresence}
          />
        </tbody>
      </table>

      <h2>Storage</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row
            id={`initialRoom_${index}`}
            name="Current room ID (as captured by initialStorage)"
            value={initialRoom}
          />
          <Row id={`items_${index}`} name="Items" value={items} />
        </tbody>
      </table>

      <h2>Others</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row
            id={`numOthers_${index}`}
            name="Others count"
            value={others.filter((o) => o.presence !== undefined).length}
          />
          <Row id={`others_${index}`} name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}
