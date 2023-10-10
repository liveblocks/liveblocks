import { createClient } from "@liveblocks/client";
import { nn } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import Link from "next/link";
import React from "react";

import { getRoomFromUrl } from "../../utils";

const client = createClient({
  publicApiKey: nn(
    process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
    "Please set NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY in the env"
  ),

  // @ts-expect-error - Hidden setting
  liveblocksServer: process.env.NEXT_PUBLIC_LIVEBLOCKS_SERVER,
});

const { RoomProvider, useMyPresence, useSelf, useOthers, useStatus } =
  createRoomContext(client);

export default function Home() {
  React.useEffect(() => {
    setText(getRoomFromUrl());
  }, []);

  const [text, setText] = React.useState("");
  const [roomId, setRoomId] = React.useState<string | null>(null);

  return (
    <>
      <h1>Auth sandbox</h1>
      <p>
        This page connects to a room using a <strong>public key</strong>{" "}
        directly (no JWT token).
      </p>
      <hr />
      <div>
        Enter same room with other tokens (open these links in different tabs):
        <ul>
          <li>
            <Link href={"/auth/pubkey?room=" + encodeURIComponent(text)}>
              <a>with pubkey</a>
            </Link>{" "}
            👈
          </li>
          <li>
            <Link href={"/auth/acc-token?room=" + encodeURIComponent(text)}>
              <a>with access token</a>
            </Link>
          </li>
          <li>
            <Link href={"/auth/id-token?room=" + encodeURIComponent(text)}>
              <a>with ID token</a>
            </Link>
          </li>
          <li>
            <Link href={"/auth/secret-legacy?room=" + encodeURIComponent(text)}>
              <a>with legacy token</a>
            </Link>
          </li>
        </ul>
      </div>
      <div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        <input type="submit" value="enter" onClick={() => setRoomId(text)} />
        <input type="submit" value="leave" onClick={() => setRoomId(null)} />
      </div>
      <hr />
      {roomId ? (
        <RoomProvider
          id={roomId}
          initialPresence={() => ({
            diceRoll: 1 + Math.floor(Math.random() * 6),
          })}
        >
          <Sandbox />
        </RoomProvider>
      ) : null}
    </>
  );
}

function Sandbox() {
  const status = useStatus();
  const self = useSelf();
  const [myPresence] = useMyPresence();
  const others = useOthers();
  return (
    <pre>{JSON.stringify({ status, self, myPresence, others }, null, 2)}</pre>
  );
}
