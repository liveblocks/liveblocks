import "reactflow/dist/style.css";

import { assertNever, type DevTools } from "@liveblocks/core";
import { useStorage } from "@plasmohq/storage/hook";
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
} from "react";
import type { NodeApi, TreeApi } from "react-arborist";
import { useEdgesState, useNodesState } from "reactflow";

import { Loading } from "../../../components/Loading";
import { truncate } from "../../../lib/truncate";
import { getNodesAndEdges, yDocToJsonTree } from "../../../lib/ydoc";
import { EmptyState } from "../../components/EmptyState";
import type { SelectItem } from "../../components/Select";
import { Select } from "../../components/Select";
import { Tabs } from "../../components/Tabs";
import { Breadcrumbs, filterNodes, YjsTree } from "../../components/Tree";
import {
  useCurrentRoomId,
  usePresence,
  useStatus,
  useYdoc,
} from "../../contexts/CurrentRoom";
import { YFlow } from "./yflow/YFlow";
import { YUpdateLog } from "./YUpdateLog";

export const YJS_TABS = ["document", "awareness", "log"] as const;
export const YDOC_VIEWS = ["diagram", "tree"] as const;
export type YjsTab = (typeof YJS_TABS)[number];
export type YdocView = (typeof YDOC_VIEWS)[number];

interface Props extends ComponentProps<"div"> {
  activeTab: YjsTab;
  setActiveTab: (value: string) => void;
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface YjsDocumentProps extends ComponentProps<"div"> {
  view: YdocView;
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

// TODO: Implement search filtering
function YjsDocumentDiagram({
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: Omit<YjsDocumentProps, "view">) {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const ydoc = useYdoc();
  const currentStatus = useStatus();

  useEffect(() => {
    let selectedNode = "";

    function onUpdate() {
      const { docEdges, docNodes } = getNodesAndEdges(
        ydoc,
        onSetNode,
        selectedNode
      );
      setEdges(docEdges);
      setNodes(docNodes);
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
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
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

function YjsDocumentTree({
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: Omit<YjsDocumentProps, "view">) {
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

function YjsDocument({ view, ...props }: YjsDocumentProps) {
  switch (view) {
    case "diagram":
      return <YjsDocumentDiagram {...props} />;
    case "tree":
      return <YjsDocumentTree {...props} />;
    default:
      assertNever(view, "Unexpected view type");
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

// TODO: Implement empty state?
function YjsLog({ className, ...props }: ComponentProps<"div">) {
  const currentStatus = useStatus();

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    return (
      <div
        className={cx(
          className,
          "absolute inset-0 flex h-full overflow-y-auto"
        )}
        {...props}
      >
        <YUpdateLog />
      </div>
    );
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
  className,
  ...props
}: Props) {
  const currentRoomId = useCurrentRoomId();
  const [documentView, setDocumentView] = useStorage<YdocView>(
    "yjs-ydoc-view",
    YDOC_VIEWS[0]
  );
  const yjsTabs = useMemo(() => {
    return YJS_TABS.map((tab) => {
      switch (tab) {
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
                view={documentView}
              />
            ),
          };
        case "awareness":
          return {
            value: "awareness",
            title: "Awareness",
            content: <YjsAwareness key={`${currentRoomId}:awareness`} />,
          };
        case "log":
          return {
            value: "log",
            title: "Log",
            content: <YjsLog key={`${currentRoomId}:log`} />,
          };
      }
    });
  }, [currentRoomId, documentView, onSearchClear, search, searchText]);
  const documentViewsItems: SelectItem[] = useMemo(() => {
    return YDOC_VIEWS.map((view) => ({
      value: view,
      content: `View as ${view}`,
    }));
  }, []);

  const handleDocumentViewChange = useCallback(
    (value: string) => {
      void setDocumentView(value as YdocView);
    },
    [setDocumentView]
  );

  return (
    <div className={cx(className, "absolute inset-0 flex flex-col")} {...props}>
      <Tabs
        className="h-full"
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={yjsTabs}
        trailing={
          activeTab === "document" && (
            <div className="flex items-center ml-auto after:bg-light-300 after:dark:bg-dark-300 relative flex-none pl-1 after:absolute after:-left-px after:top-[20%] after:h-[60%] after:w-px">
              <Select
                value={documentView}
                onValueChange={handleDocumentViewChange}
                description="Change view"
                items={documentViewsItems}
              >
                <RadixSelect.Value>View as {documentView}</RadixSelect.Value>
              </Select>
            </div>
          )
        }
      />
    </div>
  );
}
