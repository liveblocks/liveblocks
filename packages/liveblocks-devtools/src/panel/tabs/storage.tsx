import type { StorageTreeNode } from "@liveblocks/core";

import { TreeView } from "../components/TreeView";
import { useStorage } from "../contexts/CurrentRoom";

export function Storage() {
  const storage = useStorage();

  return (
    <div className="relative">
      {storage ? (
        <TreeView
          width={600}
          data={
            // XXX Passing readonly arrays is currently not possible
            // See https://github.com/brimdata/react-arborist/pull/65
            storage as StorageTreeNode[]
          }
        />
      ) : null}
    </div>
  );
}
