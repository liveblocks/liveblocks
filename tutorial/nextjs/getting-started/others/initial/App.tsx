import { RoomProvider } from "./liveblocks.config";
import { Room } from "./Room";

export default function App() {
  const roomId = "liveblocks-tutorial-O_lmAC4kA-TJ0fQ1CX7NZ";

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <Room />
    </RoomProvider>
  );
}
