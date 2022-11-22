import type { StorageTreeNode, TreeNode, UserTreeNode } from "@liveblocks/core";
import cx from "classnames";
import type { ComponentProps, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import { truncate } from "../../lib/truncate";
import { EmptyState } from "../components/EmptyState";
import { Breadcrumbs, Tree } from "../components/Tree";
import { useStorage } from "../contexts/CurrentRoom";

interface Props extends ComponentProps<"div"> {
  search?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function Storage({ search, onSearchClear, className, ...props }: Props) {
  const storage = useStorage();
  const tree = useRef<TreeApi<TreeNode>>(null);
  const [focusedNode, setFocusedNode] = useState<NodeApi<TreeNode> | null>(
    null
  );
  const [isEmptySearch, setEmptySearch] = useState(false);

  const handleFocus = useCallback((node: NodeApi<TreeNode>) => {
    setFocusedNode(node);
  }, []);

  const handleBreadcrumbClick = useCallback(
    (node: NodeApi<TreeNode> | null) => {
      tree.current?.focus(node, { scroll: true });
    },
    []
  );

  const searchMatch = useCallback(
    (node: NodeApi<StorageTreeNode | UserTreeNode>, search: string) =>
      String(node.data.key).toLowerCase().includes(search.toLowerCase()),
    []
  );

  useEffect(() => {
    if (tree.current) {
      setEmptySearch(tree.current.visibleNodes.length === 0);
    }
  }, [search]);

  return (
    <div className={cx(className, "absolute inset-0")} {...props}>
      {storage ? (
        <>
          {isEmptySearch ? (
            <EmptyState
              title={
                <>
                  Nothing found for “
                  <span className="text-dark-0 dark:text-light-0 font-semibold">
                    {truncate(search ?? "", 32)}
                  </span>
                  ”.
                </>
              }
              description={<>Only properties are searchable, not values.</>}
              actions={[{ title: "Clear search", onClick: onSearchClear }]}
            />
          ) : null}
          <div
            className={cx(
              "absolute inset-0 flex flex-col",
              isEmptySearch && "hidden"
            )}
          >
            <Tree
              data={storage}
              ref={tree}
              onFocus={handleFocus}
              searchTerm={search}
              searchMatch={searchMatch}
            />
            {focusedNode ? (
              <Breadcrumbs
                className="flex-none"
                node={focusedNode}
                onNodeClick={handleBreadcrumbClick}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
