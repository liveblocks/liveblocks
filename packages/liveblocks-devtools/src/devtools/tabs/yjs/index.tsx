import { assertNever } from "@liveblocks/core";
import * as RadixSelect from "@radix-ui/react-select";
import cx from "classnames";
import {
  type ComponentProps,
  Fragment,
  type MouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NodeApi, TreeApi } from "react-arborist";

import { Loading } from "../../../components/Loading";
import { truncate } from "../../../lib/truncate";
import { EmptyState } from "../../components/EmptyState";
import type { SelectItem } from "../../components/Select";
import { Select } from "../../components/Select";
import { Tabs } from "../../components/Tabs";
import {
  createTreeFromYUpdates,
  filterYNodes,
  getNodePath,
  getYTreeNodeColor,
  getYTreeNodeIcon,
  JsonTree,
  makeJsonNode,
  SPECIAL_HACK_PREFIX,
  YjsTree,
  YLogsTree,
} from "../../components/Tree";
import {
  useCurrentRoomId,
  usePresence,
  useStatus,
  useYNode,
  useYUpdates,
} from "../../contexts/CurrentRoom";
import type { YTreeNode } from "./to-yjs-tree-node";
import { toTreeYNode } from "./to-yjs-tree-node";
import { YFlow } from "./yflow/YFlow";

export const YJS_TABS = ["document", "awareness", "changes"] as const;
export const YJS_CHANGES_VIEWS = ["diagram", "list"] as const;
export type YjsTab = (typeof YJS_TABS)[number];
export type YjsChangesView = (typeof YJS_CHANGES_VIEWS)[number];

interface Props extends ComponentProps<"div"> {
  activeTab: YjsTab;
  setActiveTab: (value: string) => void;
  changesView: YjsChangesView;
  setChangesView: (value: string) => void;
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface YjsChangesProps extends ComponentProps<"div"> {
  view: YjsChangesView;
}

interface YjsDocumentProps extends ComponentProps<"div"> {
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

function YjsChangesList({ className, ...props }: ComponentProps<"div">) {
  const currentStatus = useStatus();
  const updates = useYUpdates();
  const tree = useMemo(() => createTreeFromYUpdates(updates), [updates]);

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    if (updates.length > 0) {
      return (
        <div
          className={cx(
            className,
            "absolute inset-0 flex h-full overflow-y-auto"
          )}
          {...props}
        >
          <YLogsTree data={tree} />
        </div>
      );
    } else {
      return (
        <EmptyState
          description={<>There seems to be no Yjs changes in this&nbsp;room.</>}
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}

function YjsChanges({ view, ...props }: YjsChangesProps) {
  switch (view) {
    case "diagram":
      return <YFlow {...props} />;
    case "list":
      return <YjsChangesList {...props} />;
    default:
      assertNever(view, "Unexpected view type");
  }
}

function YjsDocument({
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: YjsDocumentProps) {
  const currentStatus = useStatus();
  const node = useYNode();
  const tree = useMemo(() => toTreeYNode(node).payload, [node]);
  const filteredNode = useMemo(() => {
    return search ? filterYNodes(tree, search) : tree;
  }, [tree, search]);
  const treeRef = useRef<TreeApi<YTreeNode>>(null);
  const [selectedNode, setSelectedNode] = useState<NodeApi<YTreeNode> | null>(
    null
  );

  const handleSelect = useCallback((nodes: NodeApi<YTreeNode>[]) => {
    const [node] = nodes;

    if (node) {
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
  }, []);

  const handleBreadcrumbClick = useCallback(
    (node: NodeApi<YTreeNode> | null) => {
      treeRef.current?.focus(node, { scroll: true });
    },
    []
  );

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    if (filteredNode.length > 0) {
      return (
        <div className={cx(className, "absolute inset-0")} {...props}>
          <div className="absolute inset-0 flex flex-col">
            <YjsTree
              data={filteredNode}
              ref={treeRef}
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
    } else if (tree.length > 0 && filteredNode.length === 0) {
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
          description={<>This room’s Yjs document appears to be&nbsp;empty.</>}
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}

function YjsAwareness({ className, ...props }: ComponentProps<"div">) {
  const currentStatus = useStatus();
  const presence = usePresence();
  const hasAwareness = useMemo(() => {
    return presence.some((user) => user.payload.presence.__yjs);
  }, [presence]);

  const awareness = useMemo(
    () =>
      presence
        .map((user) => user.payload.presence.__yjs)
        .map((awareness, index) =>
          makeJsonNode(
            `${SPECIAL_HACK_PREFIX}:${index}`,
            index.toString(),
            awareness
          )
        ),
    [presence]
  );

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    if (presence.length > 0 && hasAwareness) {
      return (
        <div
          className={cx(className, "absolute inset-0 flex h-full flex-col")}
          {...props}
        >
          <JsonTree data={awareness} />
        </div>
      );
    } else if (presence.length > 0 && !hasAwareness) {
      return (
        <EmptyState
          description={
            <>There seems to be no Yjs Awareness in this&nbsp;room.</>
          }
        />
      );
    } else {
      return (
        <EmptyState
          description={
            <>There seems to be no users present in this&nbsp;room.</>
          }
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}

export function Yjs({
  search,
  searchText,
  onSearchClear,
  activeTab,
  setActiveTab,
  changesView,
  setChangesView,
  className,
  ...props
}: Props) {
  const currentRoomId = useCurrentRoomId();
  const yjsTabs = useMemo(() => {
    return YJS_TABS.map((tab) => {
      switch (tab) {
        case "changes":
          return {
            value: "changes",
            title: "Changes",
            content: (
              <YjsChanges key={`${currentRoomId}:changes`} view={changesView} />
            ),
          };
        case "document":
          return {
            value: "document",
            title: "Document",
            content: (
              <YjsDocument
                key={`${currentRoomId}:ydoc`}
                search={search}
                searchText={searchText}
                onSearchClear={onSearchClear}
              />
            ),
          };
        case "awareness":
          return {
            value: "awareness",
            title: "Awareness",
            content: <YjsAwareness key={`${currentRoomId}:awareness`} />,
          };
      }
    });
  }, [changesView, currentRoomId, onSearchClear, search, searchText]);
  const documentViewsItems: SelectItem[] = useMemo(() => {
    return YJS_CHANGES_VIEWS.map((view) => ({
      value: view,
      content: `View as ${view}`,
    }));
  }, []);

  return (
    <div className={cx(className, "absolute inset-0 flex flex-col")} {...props}>
      <Tabs
        className="h-full"
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={yjsTabs}
        trailing={
          activeTab === "changes" && (
            <div className="flex items-center ml-auto after:bg-light-300 after:dark:bg-dark-300 relative flex-none pl-1 after:absolute after:-left-px after:top-[20%] after:h-[60%] after:w-px">
              <Select
                value={changesView}
                onValueChange={setChangesView}
                description="Change view"
                items={documentViewsItems}
              >
                <RadixSelect.Value>View as {changesView}</RadixSelect.Value>
              </Select>
            </div>
          )
        }
      />
    </div>
  );
}

export function Breadcrumbs({
  node,
  onNodeClick,
  className,
  ...props
}: ComponentProps<"div"> & {
  node: NodeApi<YTreeNode>;
  onNodeClick: (node: NodeApi<YTreeNode> | null) => void;
}) {
  const nodePath = getNodePath(node);

  return (
    <div
      className={cx(
        className,
        "border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 scrollbar-hidden flex h-8 items-center gap-1.5 overflow-x-auto border-t px-2.5"
      )}
      {...props}
    >
      <span
        key={node.data.id}
        className="text-dark-600 dark:text-light-600 flex h-5 items-center font-mono text-[95%]"
      >
        $
      </span>
      {nodePath.map((node) => (
        <Fragment key={node.id}>
          <svg
            width="7"
            height="10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-none opacity-50"
          >
            <path
              d="M1.5 8.5 5 5 1.5 1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <button
            key={node.data.id}
            className=" hover:text-dark-0 focus-visible:text-dark-0 dark:hover:text-light-0 dark:focus-visible:text-light-0 text-dark-600 dark:text-light-600 flex h-5 items-center gap-1.5 font-mono text-[95%]"
            onClick={() => onNodeClick(node)}
          >
            <div className={getYTreeNodeColor(node.data)}>
              {getYTreeNodeIcon(node.data)}
            </div>
            <span>{node.data.key}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}
