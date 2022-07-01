import { useRef } from "react";
import { useRouter } from "next/router";
import LiveCanvas from "../../components/LiveCanvas";
import LiveCursors from "../../components/LiveCursors";
import LiveAvatars from "../../components/LiveAvatars";
import { RoomProvider } from "../../liveblocks.config";
import { LiveMap } from "@liveblocks/client";
import styles from "../../styles/Canvas.module.css";

export default function MultiplayerRoom() {
  const router = useRouter();
  const cursorPanel = useRef<HTMLDivElement>(null);

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  const roomId = router.query.id;
  return (
    <>
      {/*
        * Pass the name of the current Liveblocks room to `id`.
        *
        * `initialPresence holds the initial Liveblocks presence,
        * which in this example is a cursor with no position.
        *
        * `initialStorage` holds the initial Liveblocks storage,
        * which in this example is a `shapes` LiveMap.
        */}
      <RoomProvider
        id={"nextjs-starter-canvas-" + roomId}
        initialPresence={{ cursor: null }}
        initialStorage={{ shapes: new LiveMap() }}
      >
        <div className={styles.wrapper}>
          <header className={styles.header}>
            <LiveAvatars />
          </header>
          <main ref={cursorPanel} className={styles.main}>
            <LiveCanvas />
            <LiveCursors cursorPanel={cursorPanel} />
          </main>
        </div>
      </RoomProvider>
    </>
  );
}
