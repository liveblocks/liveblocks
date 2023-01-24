import type { DevTools } from "@liveblocks/core";
import cx from "classnames";
import type { ComponentProps, MouseEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import { truncate } from "../../lib/truncate";
import { EmptyState } from "../components/EmptyState";
import { Breadcrumbs, filterNodes, StorageTree } from "../components/Tree";
import { useStorage } from "../contexts/CurrentRoom";

interface Props extends ComponentProps<"div"> {
  search?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function Storage({ search, onSearchClear, className, ...props }: Props) {
  const storage = useStorage();
  const filteredStorage = useMemo(
    () => filterNodes(storage, search),
    [storage, search]
  );
  const tree = useRef<TreeApi<DevTools.LsonTreeNode>>(null);
  const [selectedNode, setSelectedNode] =
    useState<NodeApi<DevTools.LsonTreeNode> | null>(null);

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

  return filteredStorage.length > 0 ? (
    <div className={cx(className, "absolute inset-0")} {...props}>
      <div className="absolute inset-0 flex flex-col">
        <StorageTree
          data={filteredStorage}
          ref={tree}
          onSelect={handleSelect}
          search={search}
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
  ) : storage.length > 0 ? (
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
  ) : (
    <EmptyState
      description={<>This room’s storage appears to be&nbsp;empty.</>}
    />
  );
}
