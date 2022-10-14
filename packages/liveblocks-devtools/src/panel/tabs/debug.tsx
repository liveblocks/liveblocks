import { useTheme } from "../theme";
import { useConnectedRoom } from "../contexts/ConnectedRoom";

export function Debug() {
  const theme = useTheme();
  const room = useConnectedRoom();
  return (
    <>
      <h1>Liveblocks ({theme})</h1>
      <pre>{JSON.stringify(room, null, 2)}</pre>
    </>
  );
}
