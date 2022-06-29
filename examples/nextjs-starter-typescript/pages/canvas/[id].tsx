import { useRef } from "react";
import { useRouter } from "next/router";
import LiveCanvas from "../../components/LiveCanvas";
import LiveCursors from "../../components/LiveCursors";
import LiveAvatars from "../../components/LiveAvatars";
import { RoomProvider } from "../../liveblocks.config";
import { LiveMap } from "@liveblocks/client";

/*
const roomId = typeof window !==  "undefined"
  ? new URL(window.location.href).pathname.split('/room/')[1]
  : "";
 */

const initialStorage = () => ({
  shapes: new LiveMap()
});

export default function MultiplayerRoom() {
  const router = useRouter();
  const cursorPanel = useRef<HTMLDivElement>(null);

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  const roomId = router.query.id;
  return (
    <RoomProvider id={"nextjs-starter-canvas-" + roomId} initialStorage={initialStorage}>
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
