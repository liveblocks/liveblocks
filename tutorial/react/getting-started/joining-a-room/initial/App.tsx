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
      <div>Not in a room</div>
    </LiveblocksProvider>
  );
}
