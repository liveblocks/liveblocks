import { Json, createRoomContext, ClientSideSuspense } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import {
  getRoomFromUrl,
  opaqueIf,
  Row,
  styles,
  useRenderCount,
} from "../../utils";

const client = createLiveblocksClient();

type Presence = {
  foo?: number;
  bar?: string;
  qux?: number;
};

const {
  suspense: {
    RoomProvider,
    useBroadcastEvent,
    useEventListener,
    useMyPresence,
    useOthers,
  },
} = createRoomContext<
  Presence,
  never,
  never,
  { emoji: string; type: "EMOJI" } | number
>(client);

export default function Home() {
  const [isVisible, setIsVisible] = React.useState(true);

  const roomId = getRoomFromUrl();
  return (
    <>
      <button
        id="leave-room"
        style={opaqueIf(isVisible)}
        onClick={() => setIsVisible(false)}
      >
        Leave
      </button>
      <button
        id="enter-room"
        style={opaqueIf(!isVisible)}
        onClick={() => setIsVisible(true)}
      >
        Enter
      </button>
      {isVisible && (
        <RoomProvider id={roomId} initialPresence={{}}>
          <div>
            <h1>Presence sandbox (with suspense)</h1>
          </div>
          <ClientSideSuspense fallback="Loading...">
            {() => (
              <>
                <PresenceSandbox />
                <EventSandbox />
              </>
            )}
          </ClientSideSuspense>
        </RoomProvider>
      )}
    </>
  );
}

function PresenceSandbox() {
  const renderCount = useRenderCount();
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const theirPresence = others[0]?.presence;

  return (
    <>
      <button
        id="inc-foo"
        onClick={() => updateMyPresence({ foo: (myPresence.foo ?? 0) + 1 })}
      >
        Increment
      </button>

      <button id="set-bar" onClick={() => updateMyPresence({ bar: "hey" })}>
        Set bar
      </button>

      <button id="set-qux" onClick={() => updateMyPresence({ qux: 1337 })}>
        Set qux
      </button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
        </tbody>
      </table>

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
            id="numOthers"
            name="Others count"
            value={others.filter((o) => o.presence !== undefined).length}
          />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </>
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
