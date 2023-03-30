import { RoomProvider } from "./liveblocks.config";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      Connected!
    </RoomProvider>
  );
}
