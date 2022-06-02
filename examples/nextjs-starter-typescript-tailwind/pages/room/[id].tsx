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
      <main className="flex place-items-center place-content-center w-full h-screen select-none">
        <LiveAvatars />
        <LiveCursors />
      </main>
    </RoomProvider>
  )
}
