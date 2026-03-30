import { LiveblocksFlow } from "@liveblocks/react-flow";
import type { Edge, Node } from "@xyflow/react";
import { nanoid } from "nanoid";

export const BLOCK_SHAPES = ["rectangle", "ellipse", "diamond"] as const;

export const BLOCK_COLORS = {
  blue: "#09f",
  cyan: "#0cd",
  green: "#3c5",
  yellow: "#fb0",
  orange: "#f81",
  red: "#f24",
  pink: "#e4b",
  purple: "#85f",
  gray: "#678",
} as const;

export const DEFAULT_BLOCK_SIZE = 100;
export const DEFAULT_BLOCK_SHAPE: BlockShape = "rectangle";
export const DEFAULT_BLOCK_COLOR: BlockColor = "gray";

export const FLOWCHART_STORAGE_KEY = "flow" as const;

export const FLOWCHART_EDGE_TYPE = "smoothstep" as const;

export const BLOCK_HANDLE_SIDES = ["top", "right", "bottom", "left"] as const;

export type Point = { x: number; y: number };
export type Frame = { position: Point; width?: number; height?: number };

export type BlockShape = (typeof BLOCK_SHAPES)[number];
export type BlockColor = keyof typeof BLOCK_COLORS;
export type BlockHandleSide = (typeof BLOCK_HANDLE_SIDES)[number];
export type BlockSourceHandleId = `src-${BlockHandleSide}`;
export type BlockTargetHandleId = `tgt-${BlockHandleSide}`;

export type FlowchartNodeData = {
  label: string;
  shape: BlockShape;
  color: BlockColor;
};

export type FlowchartEdgeData = {
  label: string;
};

export type FlowchartNode = Node<FlowchartNodeData, "block">;
export type FlowchartEdge = Edge<FlowchartEdgeData, typeof FLOWCHART_EDGE_TYPE>;
export type FlowchartFlow = LiveblocksFlow<FlowchartNode, FlowchartEdge>;

export function blockSourceHandleId(
  side: BlockHandleSide
): BlockSourceHandleId {
  return `src-${side}`;
}

export function blockTargetHandleId(
  side: BlockHandleSide
): BlockTargetHandleId {
  return `tgt-${side}`;
}

export function getNodeSize(node: Pick<Frame, "width" | "height">) {
  return {
    width: node.width ?? DEFAULT_BLOCK_SIZE,
    height: node.height ?? DEFAULT_BLOCK_SIZE,
  };
}

export function getNodeCenter(node: Frame): Point {
  const { width, height } = getNodeSize(node);

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

export function flowPointToNormalized(
  node: Frame,
  flowX: number,
  flowY: number
): Point {
  const { width, height } = getNodeSize(node);

  return {
    x: (flowX - node.position.x) / Math.max(width, 1),
    y: (flowY - node.position.y) / Math.max(height, 1),
  };
}

export function normalizedToFlowPoint(node: Frame, normalized: Point): Point {
  const { width, height } = getNodeSize(node);

  return {
    x: node.position.x + normalized.x * Math.max(width, 1),
    y: node.position.y + normalized.y * Math.max(height, 1),
  };
}

export function getNodeAtFlowPoint(
  nodes: FlowchartNode[],
  flow: Point
): FlowchartNode | undefined {
  return nodes.find((node) => {
    const { width, height } = getNodeSize(node);
    const { x, y } = node.position;

    return (
      flow.x >= x && flow.x <= x + width && flow.y >= y && flow.y <= y + height
    );
  });
}

export function getMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function getEdgeHandlesForNodes(
  sourceNode: Frame,
  targetNode: Frame
): {
  sourceHandle: BlockSourceHandleId;
  targetHandle: BlockTargetHandleId;
} {
  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0
      ? {
          sourceHandle: blockSourceHandleId("right"),
          targetHandle: blockTargetHandleId("left"),
        }
      : {
          sourceHandle: blockSourceHandleId("left"),
          targetHandle: blockTargetHandleId("right"),
        };
  }

  return dy >= 0
    ? {
        sourceHandle: blockSourceHandleId("bottom"),
        targetHandle: blockTargetHandleId("top"),
      }
    : {
        sourceHandle: blockSourceHandleId("top"),
        targetHandle: blockTargetHandleId("bottom"),
      };
}

export function createFlowchartNode(args: {
  id?: string;
  position: Point;
  label?: string;
  shape?: BlockShape;
  color?: BlockColor;
  width?: number;
  height?: number;
  selected?: boolean;
}): FlowchartNode {
  return {
    id: args.id ?? `block-${nanoid()}`,
    type: "block",
    position: args.position,
    width: args.width ?? DEFAULT_BLOCK_SIZE,
    height: args.height ?? DEFAULT_BLOCK_SIZE,
    selected: args.selected,
    data: {
      label: args.label ?? "",
      shape: args.shape ?? DEFAULT_BLOCK_SHAPE,
      color: args.color ?? DEFAULT_BLOCK_COLOR,
    },
  };
}

export function createFlowchartEdge(args: {
  id?: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle: BlockSourceHandleId;
  targetHandle: BlockTargetHandleId;
  selected?: boolean;
}): FlowchartEdge {
  return {
    id: args.id ?? `e-${args.source}-${args.target}-${nanoid(6)}`,
    source: args.source,
    target: args.target,
    sourceHandle: args.sourceHandle,
    targetHandle: args.targetHandle,
    type: FLOWCHART_EDGE_TYPE,
    selected: args.selected,
    data: { label: args.label ?? "" },
  };
}

export function isBlockShape(value: string | undefined): value is BlockShape {
  return value ? (BLOCK_SHAPES as readonly string[]).includes(value) : false;
}

export function getBlockShape(
  shape: string | BlockShape | undefined
): BlockShape {
  return isBlockShape(shape) ? shape : DEFAULT_BLOCK_SHAPE;
}

export function getBlockColor(color: BlockColor | undefined): string {
  return BLOCK_COLORS[color ?? DEFAULT_BLOCK_COLOR];
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
