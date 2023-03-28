import Avatars from "../components/Avatars";
import { RoomProvider } from "../liveblocks.real.config";
import styles from "./LiveblocksDemo.module.css";
import Connected from "../components/Connected";
import { useRef } from "react";
import Cursors from "@/components/Cursors";

export default function LiveblocksDemo() {
  const roomId = "{% ROOM_ID %}";
  const cursorPanel = useRef(null);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <div className={styles.liveblocksDemo} ref={cursorPanel}>
        <Avatars />
        <Connected connected={true} />
        <Cursors cursorPanel={cursorPanel} />
      </div>
    </RoomProvider>
  );
}
