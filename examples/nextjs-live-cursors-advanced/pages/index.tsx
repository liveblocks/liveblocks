import { RoomProvider, useMyPresence } from "../liveblocks.config";
import { useRouter } from "next/router";
import LiveCursors from "../components/LiveCursors";
import { useMemo, useRef } from "react";
import styles from "../styles/Index.module.css";

export default function Index() {
  const roomId = useOverrideRoomId("nextjs-live-cursors-advanced");

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
  )
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
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
