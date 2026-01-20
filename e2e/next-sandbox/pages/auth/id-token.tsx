import type {
  BaseMetadata,
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
} from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getRoomFromUrl } from "../../utils";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient({
  authEndpoint: "/api/auth/id-token",
});

const { RoomProvider, useMyPresence, useSelf, useOthers, useStatus } =
  // NOTE: We have to annotate the params here explicitly because otherwise it
  // would pick up the globally augmented types here
  createRoomContext<JsonObject, LsonObject, BaseUserMeta, Json, BaseMetadata>(
    client
  );

export default function Home() {
  useEffect(() => {
    setText(getRoomFromUrl());
  }, []);

  const [text, setText] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);

  return (
    <>
      <h1>Auth sandbox</h1>
      <p>
        This page connects to a room using an <strong>ID token</strong> (see{" "}
        <code>/api/auth/id-token</code> backend implementation).
      </p>
      <hr />
      <div>
        Enter same room with other tokens (open these links in different tabs):
        <ul>
          <li>
            <Link href={"/auth/pubkey?room=" + encodeURIComponent(text)}>
              with pubkey
            </Link>
          </li>
          <li>
            <Link href={"/auth/acc-token?room=" + encodeURIComponent(text)}>
              with access token
            </Link>
          </li>
          <li>
            <Link href={"/auth/id-token?room=" + encodeURIComponent(text)}>
              with ID token
            </Link>{" "}
            👈
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
