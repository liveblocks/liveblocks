import { LiveObject } from "@liveblocks/client";
import { RoomProvider } from "./liveblocks.config";
import { Room } from "./Room";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{
        person: new LiveObject({ name: "Marie", age: 30 }),
      }}
    >
      <Room />
    </RoomProvider>
  );
}
