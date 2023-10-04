import { Json, createRoomContext } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import { genRoomId, getRoomFromUrl, styles, Row } from "../../utils";

const client = createLiveblocksClient();

type Presence = {
  foo?: number;
  bar?: string;
  qux?: number;
};

const {
  RoomProvider,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
  useOthers,
} = createRoomContext<
  Presence,
  never,
  never,
  { emoji: string; type: "EMOJI" } | number
>(client);

export default function Home() {
  const [isVisible, setIsVisible] = React.useState(true);

  const roomId = getRoomFromUrl() ?? genRoomId("e2e-presence");
  return (
    <>
      <button id="leave-room" onClick={() => setIsVisible(false)}>
        Leave
      </button>
      <button id="enter-room" onClick={() => setIsVisible(true)}>
        Enter
      </button>
      {isVisible && (
        <RoomProvider id={roomId} initialPresence={{}}>
          <PresenceSandbox />
          <EventSandbox />
        </RoomProvider>
      )}
    </>
  );
}

function PresenceSandbox() {
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const theirPresence = others[0]?.presence;

  return (
    <div>
      <h1>Presence sandbox</h1>
      <button
        id="inc-foo"
        onClick={() => updateMyPresence({ foo: (myPresence.foo ?? 0) + 1 })}
      >
        Increment foo
      </button>

      <button id="set-bar" onClick={() => updateMyPresence({ bar: "hey" })}>
        Set bar
      </button>

      <button id="set-qux" onClick={() => updateMyPresence({ qux: 1337 })}>
        Set qux
      </button>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="myPresence" name="My presence" value={myPresence} />
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
        </tbody>
      </table>

      <h2>Others</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row
            id="othersCount"
            name="Others count"
            value={others.filter((o) => o.presence !== undefined).length}
          />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}

function EventSandbox() {
  const broadcast = useBroadcastEvent();
  const [received, setReceived] = React.useState<Json[]>([]);

  useEventListener(({ event }) => {
    setReceived((x) => [...x, event]);
  });

  return (
    <div>
      <h1>Event sandbox</h1>
      <button
        id="broadcast-emoji"
        onClick={() => broadcast({ type: "EMOJI", emoji: "🔥" })}
      >
        Broadcast 🔥
      </button>
      <button id="broadcast-number" onClick={() => broadcast(42)}>
        Broadcast 42
      </button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="events" name="Events received" value={received} />
        </tbody>
      </table>
    </div>
  );
}
