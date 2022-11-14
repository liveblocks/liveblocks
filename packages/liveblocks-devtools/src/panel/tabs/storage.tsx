import { useRenderCount } from "../../hooks/useRenderCount";
import { Tree } from "../components/TreeView";
import { useCurrentRoom } from "../contexts/RoomMirror";

export function Storage() {
  const renderCount = useRenderCount();
  const room = useCurrentRoom();
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      {room.storage !== undefined ? (
        <Tree width={600} data={room.storage} />
      ) : null}
    </div>
  );
}
