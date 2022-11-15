import { useMemo } from "react";

import { useRenderCount } from "../../hooks/useRenderCount";
import { Tree } from "../components/TreeView";
import { useMe, useOthers } from "../contexts/CurrentRoom";

export function Me() {
  const renderCount = useRenderCount();
  const me = useMe();
  const data = useMemo(() => (me ? [me] : null), [me]);
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      <div>
        {data !== null ? <Tree height={170} width={360} data={data} /> : null}
      </div>
    </div>
  );
}

export function Others() {
  const renderCount = useRenderCount();
  const others = useOthers();
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      <div>
        {others !== null ? (
          <Tree height={500} width={360} data={others} openByDefault={false} />
        ) : null}
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
