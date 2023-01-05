import type { DevTools } from "@liveblocks/core";
import cx from "classnames";
import type { ComponentProps, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import { truncate } from "../../lib/truncate";
import { EmptyState } from "../components/EmptyState";
import { Breadcrumbs, StorageTree } from "../components/Tree";
import { useStorage } from "../contexts/CurrentRoom";

interface Props extends ComponentProps<"div"> {
  search?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function Storage({ search, onSearchClear, className, ...props }: Props) {
  const storage = useStorage();
  const tree = useRef<TreeApi<DevTools.LsonTreeNode>>(null);
  const [selectedNode, setSelectedNode] =
    useState<NodeApi<DevTools.LsonTreeNode> | null>(null);
  const [isEmptySearch, setEmptySearch] = useState(false);

  const handleSelect = useCallback(
    (nodes: NodeApi<DevTools.LsonTreeNode>[]) => {
      const [node] = nodes;

      if (node) {
        setSelectedNode(node);
      } else {
        setSelectedNode(null);
      }
    },
    []
  );

  const handleBreadcrumbClick = useCallback(
    (node: NodeApi<DevTools.LsonTreeNode> | null) => {
      tree.current?.focus(node, { scroll: true });
    },
    []
  );

  const searchMatch = useCallback(
    (node: NodeApi<DevTools.LsonTreeNode>, search: string) =>
      node.data.key.toLowerCase().includes(search.toLowerCase()),
    []
  );

  useEffect(() => {
    if (tree.current) {
      setEmptySearch(tree.current.visibleNodes.length === 0);
    }
  }, [search]);

  return (
    <div className={cx(className, "absolute inset-0")} {...props}>
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
        <StorageTree
          data={storage}
          ref={tree}
          onSelect={handleSelect}
          searchTerm={search}
          searchMatch={searchMatch}
        />
        {selectedNode ? (
          <Breadcrumbs
            className="flex-none"
            node={selectedNode}
            onNodeClick={handleBreadcrumbClick}
          />
        ) : null}
      </div>
    </div>
  );
}
