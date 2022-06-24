import { RoomProvider } from "@liveblocks/react";
import { useRouter } from "next/router";
import LiveCursors from "../components/LiveCursors";
import { useMemo, useRef } from "react";
import styles from "../styles/Index.module.css";

export default function Example() {
  const roomId = useOverrideRoomId("nextjs-live-cursors-advanced");
  const cursorPanel = useRef(null);

  return (
    <RoomProvider id={roomId}>
      <main ref={cursorPanel} className={styles.main}>
        <LiveCursors cursorPanel={cursorPanel} />
      </main>
    </RoomProvider>
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
