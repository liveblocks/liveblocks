import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { CollaborativeApplication } from "./CollaborativeApplication";

export default function App() {
  const roomId = "{% ROOM_ID %}";
  const publicApiKey = "{% LIVEBLOCKS_PUBLIC_KEY %}";

  return (
    <LiveblocksProvider publicApiKey={publicApiKey}>
      <CollaborativeApplication />
    </LiveblocksProvider>
  );
}
