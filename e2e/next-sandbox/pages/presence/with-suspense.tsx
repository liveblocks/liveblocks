import { Json, createRoomContext, ClientSideSuspense } from "@liveblocks/react";
import React from "react";
import createLiveblocksClient from "../../utils/createClient";
import { genRoomId, getRoomFromUrl, Row, styles } from "../../utils";

const client = createLiveblocksClient();

type Presence = {
  count?: number;
  secondProp?: number;
  thirdProp?: number;
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

  const roomId = getRoomFromUrl() ?? genRoomId("e2e-presence-with-suspense");
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
  const others = useOthers();
  const [me, updateMyPresence] = useMyPresence();

  return (
    <>
      <button
        id="increment-button"
        onClick={() => updateMyPresence({ count: me.count ? me.count + 1 : 1 })}
      >
        Increment
      </button>

      <button
        id="set-second-prop"
        onClick={() => updateMyPresence({ secondProp: 1 })}
      >
        Set second prop
      </button>

      <button
        id="set-third-prop"
        onClick={() => updateMyPresence({ thirdProp: 1 })}
      >
        Set third prop
      </button>

      <h2>Me</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="me-count" name="Count" value={me.count} />
          <Row id="me-second-prop" name="Second prop" value={me.secondProp} />
          <Row id="me-third-prop" name="Third prop" value={me.thirdProp} />
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
