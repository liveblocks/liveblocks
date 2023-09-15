/* eslint-disable eqeqeq */
import type { DevTools, Json } from "@liveblocks/core";
import type { Edge, Node } from "reactflow";
import { MarkerType } from "reactflow";
import * as Y from "yjs";

type YJsonExport =
  | {
      [x: string]: unknown;
    }
  | string
  | undefined
  | unknown[];

export type YType = "unknown" | "text" | "array" | "xml";

/*
given an item in a ydoc, try and infer its type
*/
function getType(item: Y.Item): YType {
  // only text has ContentFormat and ContentEmbed
  if (
    item.content instanceof Y.ContentFormat ||
    item.content instanceof Y.ContentEmbed
  ) {
    return "text";
  }
  // we've got something that wasn't deleted, so try and find out what it is
  if ("arr" in item.content) return "array";
  if ("str" in item.content) return "text";
  if ("type" in item.content) return "xml";
  return "unknown";
}

function getFormattedText(value: Y.Item): (object | string)[] {
  const formatted = [];
  let n: Y.Item | null = value;
  console.log("get formatted text", value);
  while (n !== null) {
    if (!n.deleted) {
      if (n.content instanceof Y.ContentType) {
        // ContentType is a root level
        formatted.push(n.content.type.toJSON() as string | object);
      } else if (n.content instanceof Y.ContentString) {
        formatted.push(n.content.str);
      } else if (n.content instanceof Y.ContentFormat) {
        const { key, value } = n.content;
        console.log(key, value);
        formatted.push({ key, value });
      } else if (n.content instanceof Y.ContentEmbed) {
        formatted.push(n.content.embed);
      }
    }
    n = n.right;
  }
  return formatted;
}

/*
  Unfortunately, there's no good way to know what type of object we have inside a ydoc,
  Yjs relies on users calling `get("someKey", sometype)` or a type specific method like `getText`
  to know the type. Therefore we must add a pretty hacky method to attempt to infer the type.
  Without using one of those methods, calling `toJSON()` will just return YAbstractType's 
  `toJson` which simply returns {}. 
*/
function getYTypedValue(
  doc: Y.Doc,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Y.AbstractType<Y.YEvent<any>>,
  key: string,
  includeFormatting = false
): YJsonExport {
  if (!value._first && value._map instanceof Map && value._map.size > 0) {
    return doc.getMap(key).toJSON();
  } else if (value._first != null) {
    const type = getType(value._first);
    if (type === "text") {
      return includeFormatting
        ? getFormattedText(value._first)
        : doc.getText(key).toJSON();
    } else if (type === "array") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return doc.getArray(key).toJSON();
    } else if (type === "xml") {
      const rootXmlText = doc.get(key, Y.XmlText);
      return rootXmlText.toJSON() as YJsonExport; //doc.getXmlFragment(key).toJSON();
    }
  }
  return value.toJSON() as YJsonExport;
}

/*
Returns the JSON representation of the values within the doc. 
*/
export function yDocToJson(doc: Y.Doc): Record<string, YJsonExport> {
  const result: Record<string, YJsonExport> = {};
  for (const [key, value] of doc.share) {
    result[key] = getYTypedValue(doc, value, key);
  }
  return result;
}

export function yDocToJsonTree(doc: Y.Doc): DevTools.JsonTreeNode[] {
  const result: DevTools.JsonTreeNode[] = [];
  console.log(doc);
  console.log("Calling get json");
  for (const [key, value] of doc.share) {
    result.push({
      key,
      id: key,
      type: "Json",
      payload: getYTypedValue(doc, value, key, false) as Json,
    });
  }
  return result;
}

export type YFlowNodeData = {
  label: string;
  type: string;
  setSelectedNode?: (node: string) => void;
  isNodeSelected?: boolean;
};

export const getNodesAndEdges = (
  ydoc: Y.Doc,
  setSelectedNode: (node: string) => void,
  selectedNode: string
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
      data: { type: "header", label: `Doc:${ydoc.clientID}` },
    },
  ];

  for (const [key, value] of ydoc.store.clients) {
    y = 220;
    docNodes.push({
      id: `client-${key}`,
      position: { x, y },
      data: { type: "header", label: `Client:${key}` },
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
        const isNodeSelected =
          selectedNode === `item-${item.id.client}-${item.id.clock}`;
        const node = {
          type: "yItemNode",
          id: `item-${item.id.client}-${item.id.clock}`,
          position: { x, y },
          data: {
            type: "node",
            label: `Item:${item.id.client}:${item.id.clock}`,
            item,
            setSelectedNode,
            isNodeSelected,
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
              color: "#FF0072",
              opacity: isNodeSelected ? 1 : 0.1,
            },
            style: {
              strokeWidth: 2,
              stroke: "#FF0072",
              opacity: isNodeSelected ? 1 : 0.1,
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
              color: "#00c94a",
              opacity: isNodeSelected ? 1 : 0.1,
            },
            style: {
              strokeWidth: 2,
              stroke: "#00c94a",
              opacity: isNodeSelected ? 1 : 0.1,
            },
          };
          docEdges.push(edge);
        }
        x += 150;
        //y += 50;
      }
    });

    x += 50;
  }

  return { docEdges, docNodes };
};
