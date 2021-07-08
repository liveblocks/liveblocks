import { RoomProvider, useMyPresence, useOthers } from "@liveblocks/react";
import React from "react";

export default function Home() {
  return (
    <RoomProvider id="e2e-presence">
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const others = useOthers();
  const [me, updateMyPresence] = useMyPresence();

  return (
    <div>
      <button id="update-presence-button">Update presence</button>
      <div id="others">{JSON.stringify(others.toArray())}</div>
      <div id="me">{JSON.stringify(me)}</div>
    </div>
  );
}
