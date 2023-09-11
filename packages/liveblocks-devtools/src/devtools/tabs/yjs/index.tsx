import "reactflow/dist/style.css";

import type { DevTools } from "@liveblocks/core";
import { useStorage } from "@plasmohq/storage/hook";
import cx from "classnames";
import {
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { Loading } from "../../../components/Loading";
import { getNodesAndEdges, yDocToJsonTree } from "../../../lib/ydoc";
import { EmptyState } from "../../components/EmptyState";
import type { SelectItem } from "../../components/Select";
import { Select } from "../../components/Select";
import { Tabs } from "../../components/Tabs";
import { YjsTree } from "../../components/Tree";
import {
  useCurrentRoomId,
  useStatus,
  useYdoc,
} from "../../contexts/CurrentRoom";
import { YFlow } from "./yflow/YFlow";

export const YJS_TABS = ["document", "awareness"] as const;
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

function YjsDocument({
  view,
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: YjsDocumentProps) {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [jsonData, setJsonData] = useState<DevTools.JsonTreeNode[]>([]);
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
      const yjson = yDocToJsonTree(ydoc);

      setEdges(docEdges);
      setNodes(docNodes);
      setJsonData(yjson);
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
    return (
      <div className={cx(className, "absolute inset-0")} {...props}>
        {view === "tree" ? (
          <YjsTree data={jsonData} search={search} />
        ) : (
          <YFlow nodes={nodes} edges={edges} />
        )}
      </div>
    );
  }

  return <EmptyState visual={<Loading />} />;
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
            content: null,
          };
      }
    });
  }, [currentRoomId, documentView, onSearchClear, search, searchText]);
  const documentViewsItems: SelectItem[] = useMemo(() => {
    return YDOC_VIEWS.map((view) => ({
      value: view,
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
            <div className="flex items-center ml-auto after:bg-light-300 after:dark:bg-dark-300 relative flex-none after:absolute after:-left-px after:top-[20%] after:h-[60%] after:w-px">
              <Select
                value={documentView}
                onValueChange={handleDocumentViewChange}
                description="Change view"
                items={documentViewsItems}
              />
            </div>
          )
        }
      />
    </div>
  );
}
