import type { StorageTreeNode } from "@liveblocks/core";

import { Tree } from "../components/Tree";
import { useStorage } from "../contexts/CurrentRoom";

export function Storage() {
  const storage = useStorage();

  return (
    <div className="absolute inset-0 flex">
      {storage ? (
        <Tree
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
