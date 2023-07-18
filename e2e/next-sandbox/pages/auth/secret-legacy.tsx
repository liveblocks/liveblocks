import React from "react";
import Link from "next/link";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/auth/legacy-token",
});

const { RoomProvider, useSelf, useOthers } = createRoomContext(client);

export default function Home() {
  React.useEffect(() => {
    setText("e2e-modern-auth");
    if (typeof window !== "undefined") {
      const queryParam = window.location.search;
      if (queryParam.split("room=").length > 1) {
        setText(queryParam.split("room=")[1]);
      }
    }
  }, []);

  const [text, setText] = React.useState("");
  const [roomId, setRoomId] = React.useState<string | null>(null);

  return (
    <>
      <h1>Auth sandbox</h1>
      <p>
        This page connects to a room using a{" "}
        <strong>secret legacy token</strong> (see{" "}
        <code>/api/auth/secret-legacy</code> backend implementation).
      </p>
      <hr />
      <div>
        Enter same room with other tokens (open these links in different tabs):
        <ul>
          <li>
            <Link href={"/auth/pubkey?room=" + encodeURIComponent(text)}>
              <a>with pubkey</a>
            </Link>
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
          onChange={(e) => {
            setText(e.currentTarget.value);
            setRoomId(null);
          }}
        />
        <input type="submit" value="enter" onClick={() => setRoomId(text)} />
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
  const me = useSelf();
  const others = useOthers();
  return <pre>{JSON.stringify({ me, others }, null, 2)}</pre>;
}
