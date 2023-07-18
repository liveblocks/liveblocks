import React from "react";
import { nn } from "@liveblocks/core";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: nn(
    process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
    "Please set NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY in the env"
  ),

  // @ts-expect-error - Hidden setting
  liveblocksServer: process.env.NEXT_PUBLIC_LIVEBLOCKS_SERVER,
});

const { RoomProvider, useSelf, useOthers } = createRoomContext(client);

export default function Home() {
  let roomId = "e2e-auth-pubkey";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <RoomProvider
      id={roomId}
      initialPresence={() => ({ diceroll: 1 + Math.floor(Math.random() * 6) })}
    >
      <PubkeyAuthSandbox />
    </RoomProvider>
  );
}

function PubkeyAuthSandbox() {
  const me = useSelf();
  const others = useOthers();
  return (
    <div>
      <h1>Public auth sandbox</h1>
      <p>This page connects the client using a public API key.</p>
      <pre>{JSON.stringify({ me, others }, null, 2)}</pre>
    </div>
  );
}
