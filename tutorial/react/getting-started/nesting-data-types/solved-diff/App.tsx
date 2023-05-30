import { LiveList, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import { RoomProvider } from "./liveblocks.config";
import { Room } from "./Room";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{
        people: new LiveList([new LiveObject({ name: "Marie", age: 30 })]),
      }}
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        {() => <Room />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
