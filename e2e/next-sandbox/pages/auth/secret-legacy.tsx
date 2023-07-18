import React from "react";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/auth/legacy-token",
});

const { RoomProvider, useSelf, useOthers } = createRoomContext(client);

export default function Home() {
  let roomId = "e2e-auth-secret-legacy";
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
      <SecretLegacyAuthSandbox />
    </RoomProvider>
  );
}

function SecretLegacyAuthSandbox() {
  const me = useSelf();
  const others = useOthers();
  return (
    <div>
      <h1>Secret legacy auth sandbox</h1>
      <p>
        This page connects the client using a secret legacy auth token (where{" "}
        <code>k</code> = <code>"sec-legacy"</code> in the JWT token).
      </p>
      <pre>{JSON.stringify({ me, others }, null, 2)}</pre>
    </div>
  );
}
