import { RoomProvider, useMyPresence } from "@liveblocks/react";
import { useRouter } from "next/router";
import LiveCursors from "../components/LiveCursors";
import { useMemo, useRef } from "react";
import styles from "../styles/Index.module.css";

export default function Index() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-live-cursors-advanced"
  );

  return (
    <RoomProvider
      id={roomId}
      /**
       * Initialize the cursor position to null when joining the room
       */
      initialPresence={{
        cursor: null,
      }}
    >
      <Example />
    </RoomProvider>
  );
}

function Example() {
  const cursorPanel = useRef(null);
  const [{ cursor }] = useMyPresence();

  return (
    <main ref={cursorPanel} className={styles.main}>
      <LiveCursors cursorPanel={cursorPanel} />
      <div className={styles.text}>
        {cursor
          ? `${cursor.x} × ${cursor.y}`
          : "Move your cursor to broadcast its position to other people in the room."}
      </div>
    </main>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const { query } = useRouter();
  const exampleRoomId = useMemo(() => {
    return query?.exampleId ? `${roomId}-${query.exampleId}` : roomId;
  }, [query, roomId]);

  return exampleRoomId;
}
