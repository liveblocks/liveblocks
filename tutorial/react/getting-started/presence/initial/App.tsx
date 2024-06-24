import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { Room } from "./Room";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <LiveblocksProvider publicApiKey="{% LIVEBLOCKS_PUBLIC_KEY %}">
      <RoomProvider id={roomId}>
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          <Room />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
