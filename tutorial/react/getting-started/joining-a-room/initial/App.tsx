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
      <div>Not in a room</div>
    </LiveblocksProvider>
  );
}
