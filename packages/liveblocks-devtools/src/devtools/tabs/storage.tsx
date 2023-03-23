import type { DevTools } from "@liveblocks/core";
import cx from "classnames";
import type { ComponentProps, MouseEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import { Loading } from "../../components/Loading";
import { truncate } from "../../lib/truncate";
import { EmptyState } from "../components/EmptyState";
import { Breadcrumbs, filterNodes, StorageTree } from "../components/Tree";
import { useStatus, useStorage } from "../contexts/CurrentRoom";

interface Props extends ComponentProps<"div"> {
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function Storage({
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: Props) {
  const storage = useStorage();
  const currentStatus = useStatus();
  const filteredStorage = useMemo(() => {
    return search ? filterNodes(storage, search) : storage;
  }, [storage, search]);
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

  if (currentStatus === "open") {
    if (filteredStorage.length > 0) {
      return (
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
      );
    } else if (storage.length > 0 && filteredStorage.length === 0) {
      return (
        <EmptyState
          title={
            <>
              Nothing found for “
              <span className="text-dark-0 dark:text-light-0 font-semibold">
                {truncate(searchText ?? "", 32)}
              </span>
              ”.
            </>
          }
          description={<>Only properties are searchable, not values.</>}
          actions={[{ title: "Clear search", onClick: onSearchClear }]}
        />
      );
    } else {
      return (
        <EmptyState
          description={<>This room’s storage appears to be&nbsp;empty.</>}
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}
