import { useRenderCount } from "../../hooks/useRenderCount";
import { useCurrentRoom } from "../contexts/RoomMirror";
import { useTheme } from "../theme";

export function Debug() {
  const renderCount = useRenderCount();
  const theme = useTheme();
  const room = useCurrentRoom();
  return (
    <>
      <h1 className="space-x-3">
        <span>Liveblocks ({theme})</span>
        <span className="text-gray-400">[#{renderCount}]</span>
      </h1>
      <pre>{JSON.stringify(room, null, 2)}</pre>
    </>
  );
}
