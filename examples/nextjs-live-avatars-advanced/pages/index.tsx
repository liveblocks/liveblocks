import { RoomProvider } from "../liveblocks.config";
import { useRouter } from "next/router";
import LiveAvatars from "../components/LiveAvatars";
import { useMemo } from "react";
import styles from "../styles/Index.module.css";

export default function Example() {
  const roomId = useExampleRoomId("nextjs-live-avatars-advanced");

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <main className={styles.main}>
        <LiveAvatars />
      </main>
    </RoomProvider>
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
