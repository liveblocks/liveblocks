import { RoomProvider } from "@liveblocks/react";
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
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  let roomId = router.query.id;
  return (
    <RoomProvider id={roomId}>
      <div className="flex flex-col w-full h-screen">
        <header className="bg-white flex justify-between items-center py-2 px-4">
          <div>Multiplayer canvas</div>
          <div>
            <LiveAvatars />
          </div>
        </header>
        <main ref={scrollRef} className="relative bg-gray-100 flex-grow max-h-96 h-full overflow-y-scroll">
          <div className="h-[1000px] bg-red-100"></div>
          <LiveCursors scrollRef={scrollRef} />
        </main>
      </div>
    </RoomProvider>
  )
}
