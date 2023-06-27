import Avatars from "../components/Avatars";
import { RoomProvider } from "../liveblocks.real.config";
import Connected from "../components/Connected";
import { useRef } from "react";
import Cursors from "./Cursors";

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
      <div className="liveblocksDemo" ref={cursorPanel}>
        <Avatars />
        <Connected connected={true} />
        <Cursors cursorPanel={cursorPanel} />
      </div>
    </RoomProvider>
  );
}
