import { RoomProvider } from "./liveblocks.config";
import { Room } from "./Room";
import { ClientSideSuspense } from "@liveblocks/react";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  // Return Room inside RoomProvider
  return <>Not connected</>;
}
