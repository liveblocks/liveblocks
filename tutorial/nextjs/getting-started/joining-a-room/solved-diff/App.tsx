import { RoomProvider } from "./liveblocks.config";
import { Room } from "./Room";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  // Return Room inside RoomProvider
  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <Room />
    </RoomProvider>
  );
}
