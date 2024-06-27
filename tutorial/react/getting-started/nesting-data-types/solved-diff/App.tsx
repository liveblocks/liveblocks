import { LiveList, LiveObject } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { Room } from "./Room";

export default function App() {
  const roomId = "{% ROOM_ID %}";
  const publicApiKey = "{% LIVEBLOCKS_PUBLIC_KEY %}";

  return (
    <LiveblocksProvider publicApiKey={publicApiKey}>
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
