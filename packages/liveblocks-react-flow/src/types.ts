import type { Json } from "@liveblocks/core";
import type { Edge, Node } from "@xyflow/react";

export type LiveblocksNode<T extends Json> = {
  id: Node["id"];
  type: Node["type"];
  parentId: Node["parentId"];
  extent: Node["extent"];
  position: Node["position"];
  width: Node["width"];
  height: Node["height"];
  data: T;
};

export type LiveblocksEdge<T extends Json> = {
  id: Edge["id"];
  type: Edge["type"];
  source: Edge["source"];
  target: Edge["target"];
  sourceHandle: Edge["sourceHandle"];
  targetHandle: Edge["targetHandle"];
  data: T;
};
