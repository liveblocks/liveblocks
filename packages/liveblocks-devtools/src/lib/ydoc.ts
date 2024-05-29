/* eslint-disable eqeqeq */
import type { Edge, Node } from "reactflow";
import { MarkerType } from "reactflow";
import * as Y from "yjs";

export type YFlowNodeData = {
  label: string;
  type: string;
};

export const getNodesAndEdges = (
  ydoc: Y.Doc
): {
  docEdges: Edge<object>[];
  docNodes: Node<YFlowNodeData>[];
} => {
  let x = 100;
  let y = 100;
  const docEdges = [];
  const docNodes = [
    {
      id: ydoc.guid,
      position: { x, y },
      data: { type: "header", label: `Document: ${ydoc.clientID}` },
    },
  ];

  for (const [key, value] of ydoc.store.clients) {
    y = 220;
    docNodes.push({
      id: `client-${key}`,
      position: { x, y },
      data: { type: "header", label: `Client: ${key}` },
    });
    docEdges.push({
      id: `${ydoc.guid}-client-${key}`,
      source: ydoc.guid,
      target: `client-${key}`,
    });
    y += 100;
    x -= ((value.length - 1) * 150) / 2;
    value.forEach((item) => {
      if (item instanceof Y.Item) {
        const node = {
          type: "yItemNode",
          id: `item-${item.id.client}-${item.id.clock}`,
          position: { x, y },
          data: {
            type: "node",
            label: `Item:${item.id.client}:${item.id.clock}`,
            item,
          },
        };
        docNodes.push(node);
        docEdges.push({
          id: `item-edge-${item.id.client}-${item.id.clock}`,
          source: `client-${key}`,
          target: `item-${item.id.client}-${item.id.clock}`,
          targetHandle: "top",
        });
        if (item.right) {
          const edge = {
            sourceHandle: "right",
            targetHandle: "right",
            id: `${item.id.client}:${item.id.clock}-right-${item.right.id.client}:${item.right.id.clock}`,
            source: `item-${item.id.client}-${item.id.clock}`,
            target: `item-${item.right.id.client}-${item.right.id.clock}`,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#f43f5e",
              opacity: 0.3,
            },
            style: {
              strokeWidth: 2,
              stroke: "#f43f5e",
              opacity: 0.3,
            },
          };
          docEdges.push(edge);
        }
        if (item.left) {
          const edge = {
            sourceHandle: "left",
            targetHandle: "left",
            id: `${item.id.client}:${item.id.clock}-left-${item.left.id.client}:${item.left.id.clock}`,
            source: `item-${item.id.client}-${item.id.clock}`,
            target: `item-${item.left.id.client}-${item.left.id.clock}`,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#84cc16",
              opacity: 0.3,
            },
            style: {
              strokeWidth: 2,
              stroke: "#84cc16",
              opacity: 0.3,
            },
          };
          docEdges.push(edge);
        }
        x += 150;
      }
    });

    x += 50;
  }

  return { docEdges, docNodes };
};
