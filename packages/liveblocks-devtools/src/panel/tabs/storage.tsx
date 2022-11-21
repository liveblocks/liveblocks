import type { TreeNode } from "@liveblocks/core";
import cx from "classnames";
import type { ComponentProps } from "react";
import { useCallback, useRef, useState } from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import { Breadcrumbs, Tree } from "../components/Tree";
import { useStorage } from "../contexts/CurrentRoom";

interface Props extends ComponentProps<"div"> {
  search?: string;
}

export function Storage({ search, className, ...props }: Props) {
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
    <div className={cx(className, "absolute inset-0 flex flex-col")} {...props}>
      {storage ? (
        <>
          <Tree
            data={storage}
            ref={tree}
            onFocus={handleFocus}
            searchTerm={search}
          />
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
