import { Tree } from "react-arborist";

import { useRenderCount } from "../../hooks/useRenderCount";
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
        <Tree width={600} data={(room.storage as any).children}>
          {TreeNode as any}
        </Tree>
      ) : null}
    </div>
  );
}

// XXX Factor out as helper method
function truncate(s: string): string {
  return s.length > 24 ? s.substring(0, 24) + "..." : s;
}

function TreeNode({ node, style, dragHandle }) {
  /* This node instance can do many things. See the API reference. */
  return (
    <div
      className="space-x-2"
      style={style}
      ref={dragHandle}
      onClick={() => node.toggle()}
    >
      <span>
        {node.data.type === "LiveMap"
          ? "🗺️"
          : node.data.type === "LiveObject"
          ? "📦"
          : node.data.type === "LiveList"
          ? "📜"
          : "🔑"}
      </span>
      <span className="space-x-3">
        <span>{node.data.name}</span>
        {node.data.type === "Json" ? (
          <span className="text-gray-500">
            {truncate(JSON.stringify(node.data.data))}
          </span>
        ) : (
          <span>({node.data.type})</span>
        )}
      </span>
    </div>
  );
}
