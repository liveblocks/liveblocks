import { RoomProvider } from "../../liveblocks.config";
import { useRouter } from "next/router";
import LiveCursors from "../../components/LiveCursors";
import LiveAvatars from "../../components/LiveAvatars";
import { useRef } from "react";

/*
const roomId = typeof window !==  "undefined"
  ? new URL(window.location.href).pathname.split('/room/')[1]
  : "";
 */

export default function MultiplayerRoom() {
  const cursorPanel = useRef(null);
  const router = useRouter();

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  let roomId = router.query.id;
  return (
    <RoomProvider id={"nextjs-starter-basic-" + roomId}>
      <main ref={cursorPanel} className="flex justify-center items-center absolute inset-0 overflow-hidden">
        <LiveAvatars />
        <LiveCursors cursorPanel={cursorPanel} />
      </main>
    </RoomProvider>
  )
}
