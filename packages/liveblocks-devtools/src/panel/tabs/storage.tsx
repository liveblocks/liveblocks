import { Tree } from "../components/TreeNode";
import { useCurrentRoom } from "../contexts/RoomMirror";
import { useRenderCount } from "../../hooks/useRenderCount";

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
