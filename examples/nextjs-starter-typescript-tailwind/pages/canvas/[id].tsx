import { useRef } from "react";
import { useRouter } from "next/router";
import { RoomProvider } from "@liveblocks/react";
import LiveCanvas from "../../components/LiveCanvas";
import LiveCursors from "../../components/LiveCursors";
import LiveAvatars from "../../components/LiveAvatars";

/*
const roomId = typeof window !==  "undefined"
  ? new URL(window.location.href).pathname.split('/room/')[1]
  : "";
 */

export default function MultiplayerRoom() {
  const router = useRouter();
  const cursorPanel = useRef<HTMLDivElement>(null);

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  const roomId = router.query.id;
  return (
    <RoomProvider id={roomId}>
      <div className="fixed inset-0 overflow-hidden flex flex-col">
        <header className="bg-white flex justify-center items-center py-10 px-4">
          <LiveAvatars />
        </header>
        <main ref={cursorPanel} className="relative flex-grow">
          <LiveCanvas />
          <LiveCursors cursorPanel={cursorPanel} />
        </main>
      </div>
    </RoomProvider>
  );
}
