import type { UserTreeNode } from "@liveblocks/core";
import { useMemo } from "react";

import { TreeView } from "../components/TreeView";
import { useMe, useOthers } from "../contexts/CurrentRoom";

export function Me() {
  const me = useMe();
  const data = useMemo(() => (me ? [me] : null), [me]);

  return (
    <div className="relative">
      {data !== null ? <TreeView height={170} width={360} data={data} /> : null}
    </div>
  );
}

export function Others() {
  const others = useOthers();

  return (
    <div className="relative w-full flex-1">
      {others !== null ? (
        <TreeView
          height={500}
          width={360}
          data={
            // XXX Passing readonly arrays is currently not possible
            // See https://github.com/brimdata/react-arborist/pull/65
            others as UserTreeNode[]
          }
          openByDefault={false}
        />
      ) : null}
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
