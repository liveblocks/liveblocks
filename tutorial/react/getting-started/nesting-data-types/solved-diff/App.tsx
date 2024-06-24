import { LiveList, LiveObject } from "@liveblocks/client";
import { Room } from "./Room";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <LiveblocksProvider publicApiKey="{% LIVEBLOCKS_PUBLIC_KEY %}">
      <RoomProvider
        id={roomId}
        initialStorage={{
          people: new LiveList([new LiveObject({ name: "Marie", age: 30 })]),
        }}
      >
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          <Room />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
