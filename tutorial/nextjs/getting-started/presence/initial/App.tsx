import { RoomProvider } from "./liveblocks.config";
import { Room } from "./Room";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <Room />
    </RoomProvider>
  );
}
