import Dagre from "@dagrejs/dagre";
import { assertNever, type DevTools } from "@liveblocks/core";
import * as RadixSelect from "@radix-ui/react-select";
import cx from "classnames";
import {
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { NodeApi, TreeApi } from "react-arborist";
import type { Edge, Node } from "reactflow";
import { useEdgesState, useNodesState } from "reactflow";

import { Loading } from "../../../components/Loading";
import { truncate } from "../../../lib/truncate";
import type { YFlowNodeData } from "../../../lib/ydoc";
import { getNodesAndEdges, yDocToJsonTree } from "../../../lib/ydoc";
import { EmptyState } from "../../components/EmptyState";
import type { SelectItem } from "../../components/Select";
import { Select } from "../../components/Select";
import { Tabs } from "../../components/Tabs";
import {
  Breadcrumbs,
  createTreeFromYUpdates,
  filterNodes,
  YjsTree,
  YLogsTree,
} from "../../components/Tree";
import {
  useCurrentRoomId,
  usePresence,
  useStatus,
  useYdoc,
  useYUpdates,
} from "../../contexts/CurrentRoom";
import { YFlow } from "./yflow/YFlow";

export const YJS_TABS = ["changes", "document", "awareness"] as const;
export const YJS_CHANGES_VIEWS = ["diagram", "list"] as const;
export type YjsTab = (typeof YJS_TABS)[number];
export type YjsChangesView = (typeof YJS_CHANGES_VIEWS)[number];

const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node<YFlowNodeData, string>[],
  edges: Edge<object>[]
) => {
  g.setGraph({ rankdir: "TB", nodesep: 10 });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: 150,
      height: node.data.type === "node" ? 100 : 20,
    })
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const { x, y } = g.node(node.id);

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

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
          description={<>There seems to be no logs for this&nbsp;room.</>}
        />
      );
    }
  } else {
    return <EmptyState visual={<Loading />} />;
  }
}

function YjsChangesDiagram({ className, ...props }: ComponentProps<"div">) {
  const [isTransitionPending, startTransition] = useTransition();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const ydoc = useYdoc();
  const currentStatus = useStatus();

  useEffect(() => {
    let selectedNode = "";

    function onUpdate() {
      startTransition(() => {
        const { docEdges, docNodes } = getNodesAndEdges(
          ydoc,
          onSetNode,
          selectedNode
        );
        const layouted = getLayoutedElements(docNodes, docEdges);

        setEdges(layouted.edges);
        setNodes(layouted.nodes);
      });
    }

    function onSetNode(node: string) {
      selectedNode = node;
      onUpdate();
    }

    onUpdate();
    ydoc.on("update", onUpdate);

    return () => {
      ydoc.off("update", onUpdate);
    };
  }, [setEdges, setNodes, ydoc]);

  if (
    !isTransitionPending &&
    (currentStatus === "connected" ||
      currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
      currentStatus === "reconnecting")
  ) {
    if (edges.length > 0) {
      return (
        <div className={cx(className, "absolute inset-0")} {...props}>
          <YFlow nodes={nodes} edges={edges} />
        </div>
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

function YjsChanges({ view, ...props }: YjsChangesProps) {
  switch (view) {
    case "diagram":
      return <YjsChangesDiagram {...props} />;
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
  const ydoc = useYdoc();
  const currentStatus = useStatus();
  const [json, setJson] = useState<DevTools.JsonTreeNode[]>([]);
  const filteredJson = useMemo(() => {
    return search ? filterNodes(json, search) : json;
  }, [json, search]);
  const tree = useRef<TreeApi<DevTools.JsonTreeNode>>(null);
  const [selectedNode, setSelectedNode] =
    useState<NodeApi<DevTools.JsonTreeNode> | null>(null);

  useEffect(() => {
    function onUpdate() {
      const yjson = yDocToJsonTree(ydoc);
      console.log(yjson);
      setJson(yjson);
    }

    onUpdate();
    ydoc.on("update", onUpdate);

    return () => {
      ydoc.off("update", onUpdate);
    };
  }, [ydoc]);

  const handleSelect = useCallback(
    (nodes: NodeApi<DevTools.JsonTreeNode>[]) => {
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

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    if (filteredJson.length > 0) {
      return (
        <div className={cx(className, "absolute inset-0")} {...props}>
          <div className="absolute inset-0 flex flex-col">
            <YjsTree
              data={filteredJson}
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
    } else if (json.length > 0 && filteredJson.length === 0) {
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
          <YjsTree data={presence} />
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
