import { Tree } from "react-arborist";
import { useRenderCount } from "../../hooks/useRenderCount";
import { useCurrentRoom } from "../contexts/RoomMirror";

export function Me() {
  const renderCount = useRenderCount();
  const room = useCurrentRoom();
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      <div>
        {room.me !== undefined ? (
          // XXX Make type safe!
          <Tree height={170} width={360} data={[room.me] as any}>
            {TreeNode as any}
          </Tree>
        ) : null}
      </div>
    </div>
  );
}

export function Others() {
  const renderCount = useRenderCount();
  const room = useCurrentRoom();
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      <div>
        {/* XXX Make type safe! */}
        <Tree height={500} width={360} data={room.others as any}>
          {TreeNode as any}
        </Tree>
      </div>
    </div>
  );
}

export function Presence() {
  return (
    <div className="divide-y">
      <Me />
      <Others />
    </div>
  );
}

function TreeNode({ node, style }) {
  /* This node instance can do many things. See the API reference. */
  return node.data.type === "User" ? (
    <div style={style}>
      <span className="space-x-3">
        {"🙎‍♂️"} {node.data.name} (connection #{node.data.id})
      </span>
      {node.data.info ? (
        <div className="text-gray-500">
          {JSON.stringify(node.data.info, null, 2)}
        </div>
      ) : null}
    </div>
  ) : (
    <div style={style}>
      <span className="space-x-3">
        <span>{node.data.name}</span>
        <span className="text-gray-500">{JSON.stringify(node.data.data)}</span>
      </span>
    </div>
  );
}
