import { Tree } from "react-arborist";

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
      {room.storage !== undefined ? (
        <>
          {/* <ul> */}
          {/*   {(room.storage as { id: string; name: string }[]).map((item) => ( */}
          {/*     <li key={item.id}>{item.name}</li> */}
          {/*   ))} */}
          {/* </ul> */}
          <hr />
          <Tree width={600} data={[room.storage] as any}>
            {TreeNode as any}
          </Tree>
        </>
      ) : null}
      {/* <pre>{JSON.stringify(room.storage, null, 2)}</pre> */}
    </>
  );
}

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
