import { Tree } from "react-arborist";

import { useRenderCount } from "../../hooks/useRenderCount";
import { useCurrentRoom } from "../contexts/RoomMirror";

export function Me() {
  const renderCount = useRenderCount();
  const room = useCurrentRoom();
  const me = room.me;
  const meTreeData = me
    ? [
        {
          type: "User",
          id: me.connectionId,
          name: "Me",
          info: me.info,
          children: Object.entries(me.presence).map(([key, value]) => ({
            type: "Json",
            id: `${me.connectionId}-${key}`,
            name: key,
            data: value,
          })),
        },
      ]
    : undefined;
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      <div>
        {meTreeData !== undefined ? (
          <Tree height={170} width={360} data={meTreeData as any}>
            {TreeNode as any}
          </Tree>
        ) : null}
      </div>
    </div>
  );
}

export function Others() {
  const renderCount = useRenderCount();
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      <div>Others (TODO)</div>
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
