import { useMemo } from "react";

import { Tree } from "../components/Tree";
import { useMe, useOthers } from "../contexts/CurrentRoom";

export function Presence() {
  const me = useMe();
  const others = useOthers();
  const data = useMemo(
    () => (me && others.length > 0 ? (me ? [me, ...others] : others) : null),
    [me, others]
  );

  return (
    <div className="absolute inset-0 flex h-full flex-col">
      {data !== null ? <Tree data={data} openByDefault={false} /> : null}
    </div>
  );
}
