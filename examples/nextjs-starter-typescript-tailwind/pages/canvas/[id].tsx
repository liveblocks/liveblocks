import { RoomProvider } from "@liveblocks/react";
import { useRouter } from "next/router";
import LiveCursors from "../../components/LiveCursors";
import LiveAvatars from "../../components/LiveAvatars";

/*
const roomId = typeof window !==  "undefined"
  ? new URL(window.location.href).pathname.split('/room/')[1]
  : "";
 */

export default function MultiplayerRoom() {
  const router = useRouter();

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  let roomId = router.query.id;
  return (
    <RoomProvider id={roomId}>
      <div className="flex flex-col w-full h-screen select-none">
        <header className="bg-white flex justify-between items-center py-2 px-4">
          <div>Multiplayer canvas</div>
          <div>
            <LiveAvatars height={42} />
          </div>
        </header>
        <main className="bg-gray-100 flex-grow">

        </main>
        <LiveCursors />
      </div>
    </RoomProvider>
  )
}
