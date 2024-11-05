import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { CollaborativeApplication } from "./CollaborativeApplication";

export default function App() {
  const roomId = "{% ROOM_ID %}";
  // This public API key is solely used for the tutorial and should not be used for your own projects.
  // You can find your own public API key for a project in the Liveblocks dashboard.
  const publicApiKey = "{% LIVEBLOCKS_PUBLIC_KEY %}";

  return <div>Not connected</div>;
}
