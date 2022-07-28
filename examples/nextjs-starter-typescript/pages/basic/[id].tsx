import { RoomProvider } from "../../liveblocks.config";
import { useRouter } from "next/router";
import LiveCursors from "../../components/LiveCursors";
import LiveAvatars from "../../components/LiveAvatars";
import { useRef } from "react";
import styles from "../../styles/Basic.module.css";

// `id` param is automatically added to any pages that don't have it
// Check inside /middleware.ts

export default function MultiplayerRoom() {
  const cursorPanel = useRef(null);
  const router = useRouter();

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  let roomId = router.query.id;
  return (
    <>
      {/*
        * Pass the name of the current Liveblocks room to `id`.
        *
        * `initialPresence holds the initial Liveblocks presence,
        * which in this example is a cursor with no position.
        */}
      <RoomProvider
        id={"nextjs-starter-basic-" + roomId}
        initialPresence={{ cursor: null }}
      >
        <main ref={cursorPanel} className={styles.main}>
          <LiveAvatars />
          <LiveCursors cursorPanel={cursorPanel} />
        </main>
      </RoomProvider>
    </>
  )
}
