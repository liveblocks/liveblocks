import { RoomProvider, useMyPresence, useOthers } from "@liveblocks/react";
import React from "react";

export default function Home() {
  const [isVisible, setIsVisible] = React.useState(true);

  let roomId = "e2e-presence";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <>
      <button id="leave-room" onClick={() => setIsVisible(false)}>
        Leave
      </button>
      <button id="enter-room" onClick={() => setIsVisible(true)}>
        Enter
      </button>
      {isVisible && (
        <RoomProvider id={roomId}>
          <Sandbox />
        </RoomProvider>
      )}
    </>
  );
}

type Presence = {
  count?: number;
  secondProp?: number;
  thirdProp?: number;
};

function Sandbox() {
  const others = useOthers();
  const [me, updateMyPresence] = useMyPresence<Presence>();

  return (
    <div>
      <h1>Presence sandbox</h1>
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

      <h2>Current user</h2>
      <div>
        Count: <span id="me-count">{me.count}</span>
        Second prop: <span id="me-count">{me.secondProp}</span>
        Third prop: <span id="me-count">{me.thirdProp}</span>
      </div>

      <h2>Others</h2>
      <p id="othersCount">
        {others.toArray().filter((o) => o.presence !== undefined).length}
      </p>
      <div id="others" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(others.toArray(), null, 2)}
      </div>
    </div>
  );
}
