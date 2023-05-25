import { LiveList, LiveObject } from "@liveblocks/client";
import { RoomProvider } from "./liveblocks.config";
import { Room } from "./Room";
import { ClientSideSuspense } from "@liveblocks/react";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{
        items: new LiveList([
          new LiveObject({ complete: false, text: "My todo item" }),
        ]),
      }}
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        {() => <Room />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
