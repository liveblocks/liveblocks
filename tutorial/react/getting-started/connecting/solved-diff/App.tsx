import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { CollaborativeApplication } from "./CollaborativeApplication";

export default function App() {
  const roomId = "{% ROOM_ID %}";

  return (
    <LiveblocksProvider publicApiKey="{% LIVEBLOCKS_PUBLIC_KEY %}">
      <CollaborativeApplication />
    </LiveblocksProvider>
  );
}
