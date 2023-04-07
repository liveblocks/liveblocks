import { RoomProvider } from "./liveblocks.config";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  // Return LiveblocksApp inside RoomProvider
  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <LiveblocksApp />
    </RoomProvider>
  );
}

// Your Liveblocks app
function LiveblocksApp() {
  return <>Connected</>;
}
