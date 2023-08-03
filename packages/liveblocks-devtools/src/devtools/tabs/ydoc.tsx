
import "reactflow/dist/style.css";

import type { DevTools } from "@liveblocks/core";
import cx from "classnames";
import { type ComponentProps, type MouseEvent, useEffect, useState } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { Loading } from "../../components/Loading";
import { getNodesAndEdges, yDocToJsonTree } from "../../lib/ydoc";
import { EmptyState } from "../components/EmptyState";
import { StorageTree } from "../components/Tree";
import YFlow from "../components/yflow/YFlow";
import { useStatus, useYdoc } from "../contexts/CurrentRoom";

interface Props extends ComponentProps<"div"> {
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}



export function Ydoc({
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: Props) {
  const [jsonData, setJsonData] = useState<DevTools.JsonTreeNode[]>([]);
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const ydoc = useYdoc();
  useEffect(() => {
    let selectedNode = "";
    function onUpdate() {
      console.log(ydoc);
      const yjson = yDocToJsonTree(ydoc);
      setJsonData(yjson);
      const { docEdges, docNodes } = getNodesAndEdges(ydoc, onSetNode, selectedNode);
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
      ydoc.off("update", onUpdate)
    }
  }, [ydoc]);
  const currentStatus = useStatus();
  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    return <div className={cx(className, "absolute inset-0")} {...props}>
      <StorageTree data={jsonData} search={search} />
    </div>
  }
  return <EmptyState visual={<Loading />} />;

}
