"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProvider, useMyPresence } from "@liveblocks/react";
import { Cursors } from "@liveblocks/react-ui";
import styles from "./page.module.css";

/**
 * This file shows how to add basic live cursors using the <Cursors> component from @liveblocks/react-ui.
 */

function Example() {
  const [{ cursor }] = useMyPresence();

  return (
    <Cursors
      style={{ width: "100%", height: "100%" }}
      className={styles.container}
    >
      <div className={styles.text}>
        {cursor
          ? `${cursor.x} × ${cursor.y}`
          : "Move your cursor to broadcast its position to other people in the room."}
      </div>
    </Cursors>
  );
}

export default function Page() {
  const roomId = useExampleRoomId("liveblocks:examples:nextjs-live-cursors");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <Example />
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const searchParams = useSearchParams();
  const exampleId = searchParams?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
