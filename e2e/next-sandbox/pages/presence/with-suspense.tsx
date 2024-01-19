import type { Json } from "@liveblocks/react";
import { ClientSideSuspense, createRoomContext } from "@liveblocks/react";
import React from "react";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../../utils";
import Button from "../../utils/Button";
import createLiveblocksClient from "../../utils/createClient";

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
      <h3>
        <a href="/">Home</a> › Presence (with Suspense)
      </h3>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="leave-room"
          enabled={isVisible}
          onClick={() => setIsVisible(false)}
        >
          Leave
        </Button>
        <Button
          id="enter-room"
          enabled={!isVisible}
          onClick={() => setIsVisible(true)}
        >
          Enter
        </Button>
      </div>

      {isVisible && (
        <RoomProvider id={roomId} initialPresence={{}}>
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
      <Button
        id="inc-foo"
        onClick={() => updateMyPresence({ foo: (myPresence.foo ?? 0) + 1 })}
        subtitle={'"foo"'}
      >
        Inc
      </Button>

      <Button
        id="set-bar"
        onClick={() => updateMyPresence({ bar: "hey" })}
        subtitle={'"bar"'}
      >
        Set
      </Button>

      <Button
        id="set-qux"
        onClick={() => updateMyPresence({ qux: 1337 })}
        subtitle={'"qux"'}
      >
        Set
      </Button>

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
      <h2>Event sandbox</h2>
      <Button
        id="broadcast-emoji"
        onClick={() => broadcast({ type: "EMOJI", emoji: "🔥" })}
        subtitle="🔥 emoji"
      >
        Broadcast
      </Button>
      <Button id="broadcast-number" onClick={() => broadcast(42)} subtitle="42">
        Broadcast
      </Button>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="events" name="Events received" value={received} />
        </tbody>
      </table>
    </div>
  );
}
