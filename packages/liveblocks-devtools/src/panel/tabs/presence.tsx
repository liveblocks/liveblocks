import { useMemo } from "react";

import { useRenderCount } from "../../hooks/useRenderCount";
import { Tree } from "../components/TreeView";
import { useCurrentRoom } from "../contexts/RoomMirror";

export function Me() {
  const renderCount = useRenderCount();
  const room = useCurrentRoom();
  const me = useMemo(() => [room.me], [room.me]);
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      <div>
        {room.me !== undefined ? (
          <Tree height={170} width={360} data={me} />
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
        <Tree
          height={500}
          width={360}
          data={room.others}
          openByDefault={false}
        />
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
