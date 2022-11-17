import type { TreeNode } from "@liveblocks/core";
import { useCallback, useRef, useState } from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import { Breadcrumbs, Tree } from "../components/Tree";
import { useStorage } from "../contexts/CurrentRoom";

export function Storage() {
  const storage = useStorage();
  const tree = useRef<TreeApi<TreeNode>>(null);
  const [focusedNode, setFocusedNode] = useState<NodeApi<TreeNode> | null>(
    null
  );

  const handleFocus = useCallback((node: NodeApi<TreeNode>) => {
    setFocusedNode(node);
  }, []);

  const handleBreadcrumbClick = useCallback(
    (node: NodeApi<TreeNode> | null) => {
      tree.current?.focus(node, { scroll: true });
    },
    []
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      {storage ? (
        <>
          <Tree data={storage} ref={tree} onFocus={handleFocus} />
          {focusedNode ? (
            <Breadcrumbs
              className="flex-none"
              node={focusedNode}
              onNodeClick={handleBreadcrumbClick}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
