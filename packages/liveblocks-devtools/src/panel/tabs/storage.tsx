import type { StorageTreeNode, UserTreeNode } from "@liveblocks/core";
import { useCallback, useRef, useState } from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import {
  Breadcrumbs,
  recursivelyGetParentNodes,
  Tree,
} from "../components/Tree";
import { useStorage } from "../contexts/CurrentRoom";

export function Storage() {
  const storage = useStorage();
  const tree = useRef<TreeApi<StorageTreeNode | UserTreeNode>>(null);
  const [nodes, setNodes] = useState<NodeApi<StorageTreeNode | UserTreeNode>[]>(
    []
  );

  const handleFocus = useCallback(
    (node: NodeApi<StorageTreeNode | UserTreeNode>) => {
      setNodes([...recursivelyGetParentNodes(node).reverse(), node]);
    },
    []
  );

  const handleBreadcrumbClick = useCallback(
    (node: NodeApi<StorageTreeNode | UserTreeNode>) => {
      tree.current?.focus(node, { scroll: true });
    },
    []
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      {storage ? (
        <>
          <Tree
            data={
              // XXX Passing readonly arrays is currently not possible
              // See https://github.com/brimdata/react-arborist/pull/65
              storage as StorageTreeNode[]
            }
            ref={tree}
            onFocus={handleFocus}
          />
          <Breadcrumbs
            className="flex-none"
            nodes={nodes}
            onNodeClick={handleBreadcrumbClick}
          />
        </>
      ) : null}
    </div>
  );
}
