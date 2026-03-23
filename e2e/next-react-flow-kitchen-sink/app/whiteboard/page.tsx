"use client";

import type { ThreadData } from "@liveblocks/client";
import { ClientSideSuspense, RoomProvider, useSelf } from "@liveblocks/react";
import {
  useCreateThread,
  useEditThreadMetadata,
  useThreads,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { nanoid } from "nanoid";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow/suspense";
import {
  Background,
  BaseEdge,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  NodeResizer,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  getSmoothStepPath,
  useNodes,
  useReactFlow,
  useStore,
  useStoreApi,
  type Connection,
  type Edge,
  type EdgeProps,
  type MiniMapNodeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeRemoveChange,
  type OnResize,
} from "@xyflow/react";
import {
  AvatarStack,
  CommentPin,
  FloatingComposer,
  FloatingThread,
} from "@liveblocks/react-ui";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ComponentProps,
  CSSProperties,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { EXAMPLES } from "../examples";
import "./whiteboard.css";

const BLOCK_SHAPES = ["rectangle", "rounded", "circle"] as const;
const BLOCK_COLORS = {
  gray: "#678",
  blue: "#09f",
  cyan: "#0cd",
  green: "#3c5",
  yellow: "#fb0",
  orange: "#f81",
  red: "#f24",
  pink: "#e4b",
  purple: "#85f",
} as const;

type BlockShape = (typeof BLOCK_SHAPES)[number];
type BlockColor = keyof typeof BLOCK_COLORS;

const DEFAULT_BLOCK_SIZE = 100;
const DEFAULT_BLOCK_SHAPE: BlockShape = "rectangle";
const DEFAULT_BLOCK_COLOR: BlockColor = "gray";

type BlockNodeData = {
  label: string;
  shape: BlockShape;
  color: BlockColor;
};

type WhiteboardEdgeData = {
  label: string;
};

type WhiteboardNode = Node<BlockNodeData>;
type WhiteboardEdge = Edge<WhiteboardEdgeData>;

type ThreadPinPlacement =
  | { kind: "canvas"; flow: { x: number; y: number } }
  | {
      kind: "block";
      nodeId: string;
      normalized: { x: number; y: number };
    };

type PlacementState = "initial" | "placing" | "placed";

function getInitialNodeLayout(
  shape: BlockShape,
  horizontal: "left" | "center" | "right",
  vertical: number
) {
  const INITIAL_NODES_HORIZONTAL_GAP = 250;
  const INITIAL_NODES_VERTICAL_GAP = 36;
  const INITIAL_NODES_SIZE = 100;
  const INITIAL_NODES_LARGE_SIZE = 150;

  const width =
    shape === "circle" ? INITIAL_NODES_SIZE : INITIAL_NODES_LARGE_SIZE;
  const midX =
    horizontal === "center"
      ? 0
      : horizontal === "left"
        ? -INITIAL_NODES_HORIZONTAL_GAP
        : INITIAL_NODES_HORIZONTAL_GAP;
  const x = midX - width / 2;
  const y =
    vertical * INITIAL_NODES_SIZE + (vertical - 1) * INITIAL_NODES_VERTICAL_GAP;

  return {
    position: { x, y },
    width,
    height: INITIAL_NODES_SIZE,
  };
}

const INITIAL_NODES: WhiteboardNode[] = [
  {
    id: "brainstorm",
    type: "block",
    ...getInitialNodeLayout("rectangle", "center", 0),
    data: { label: "Brainstorm", shape: "rectangle", color: "blue" },
  },
  {
    id: "new-product",
    type: "block",
    ...getInitialNodeLayout("circle", "center", 1),
    data: { label: "Idea", shape: "circle", color: "cyan" },
  },
  {
    id: "prototype",
    type: "block",
    ...getInitialNodeLayout("rounded", "center", 2),
    data: { label: "Prototype", shape: "rounded", color: "purple" },
  },
  {
    id: "refinement",
    type: "block",
    ...getInitialNodeLayout("rectangle", "left", 3),
    data: { label: "Refinement", shape: "rectangle", color: "gray" },
  },
  {
    id: "design",
    type: "block",
    ...getInitialNodeLayout("rectangle", "right", 3),
    data: { label: "Design", shape: "rectangle", color: "green" },
  },
  {
    id: "testing",
    type: "block",
    ...getInitialNodeLayout("circle", "right", 4),
    data: { label: "Testing", shape: "circle", color: "red" },
  },
  {
    id: "production",
    type: "block",
    ...getInitialNodeLayout("rectangle", "right", 5),
    data: { label: "Production", shape: "rectangle", color: "yellow" },
  },
  {
    id: "launch",
    type: "block",
    ...getInitialNodeLayout("rounded", "right", 6),
    data: { label: "Launch", shape: "rounded", color: "orange" },
  },
];

const INITIAL_EDGES: WhiteboardEdge[] = [
  {
    id: "e-brainstorm-new-product",
    source: "brainstorm",
    target: "new-product",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
    type: "smoothstep",
    data: { label: "" },
  },
  {
    id: "e-new-product-prototype",
    source: "new-product",
    target: "prototype",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
    type: "smoothstep",
    data: { label: "" },
  },
  {
    id: "e-prototype-refinement",
    source: "prototype",
    target: "refinement",
    sourceHandle: "src-left",
    targetHandle: "tgt-top",
    type: "smoothstep",
    data: { label: "Not ready" },
  },
  {
    id: "e-prototype-design",
    source: "prototype",
    target: "design",
    sourceHandle: "src-right",
    targetHandle: "tgt-top",
    type: "smoothstep",
    data: { label: "Approved" },
  },
  {
    id: "e-refinement-design",
    source: "refinement",
    target: "design",
    sourceHandle: "src-right",
    targetHandle: "tgt-left",
    type: "smoothstep",
    data: { label: "" },
  },
  {
    id: "e-design-testing",
    source: "design",
    target: "testing",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
    type: "smoothstep",
    data: { label: "" },
  },
  {
    id: "e-testing-refinement",
    source: "testing",
    target: "refinement",
    sourceHandle: "src-left",
    targetHandle: "tgt-bottom",
    type: "smoothstep",
    data: { label: "Needs improvement" },
  },
  {
    id: "e-testing-production",
    source: "testing",
    target: "production",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
    type: "smoothstep",
    data: { label: "" },
  },
  {
    id: "e-production-launch",
    source: "production",
    target: "launch",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
    type: "smoothstep",
    data: { label: "" },
  },
];

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isBlockShape(value: string | undefined): value is BlockShape {
  return value ? (BLOCK_SHAPES as readonly string[]).includes(value) : false;
}

function getBlockShape(shape: BlockShape | undefined): string {
  return isBlockShape(shape) ? shape : DEFAULT_BLOCK_SHAPE;
}

function getBlockColor(color: BlockColor | undefined): string {
  return BLOCK_COLORS[color ?? DEFAULT_BLOCK_COLOR];
}

function getBlockStyle(color: BlockColor | undefined): CSSProperties {
  return {
    "--whiteboard-block-color": getBlockColor(color),
  } as CSSProperties;
}

function getNodeDimensions(node: WhiteboardNode): {
  width: number;
  height: number;
} {
  const w =
    typeof node.width === "number"
      ? node.width
      : typeof node.style?.width === "number"
        ? node.style.width
        : (node.measured?.width ?? DEFAULT_BLOCK_SIZE);
  const h =
    typeof node.height === "number"
      ? node.height
      : typeof node.style?.height === "number"
        ? node.style.height
        : (node.measured?.height ?? DEFAULT_BLOCK_SIZE);
  return { width: w, height: h };
}

/** Normalized 0–1 coordinates on the block; updates correctly when the block is resized. */
function flowPointToNormalizedAttach(
  node: WhiteboardNode,
  flowX: number,
  flowY: number
): { nx: number; ny: number } {
  const { width: w, height: h } = getNodeDimensions(node);
  const safeW = Math.max(w, 1);
  const safeH = Math.max(h, 1);
  return {
    nx: (flowX - node.position.x) / safeW,
    ny: (flowY - node.position.y) / safeH,
  };
}

function normalizedAttachToFlowPoint(
  node: WhiteboardNode,
  nx: number,
  ny: number
): { flowX: number; flowY: number } {
  const { width: w, height: h } = getNodeDimensions(node);
  const safeW = Math.max(w, 1);
  const safeH = Math.max(h, 1);
  return {
    flowX: node.position.x + nx * safeW,
    flowY: node.position.y + ny * safeH,
  };
}

function getBlockNodeAtFlowPoint(
  nodes: WhiteboardNode[],
  flowX: number,
  flowY: number
): WhiteboardNode | undefined {
  const blocks = nodes.filter((n) => n.type === "block");
  for (const n of blocks) {
    const { width, height } = getNodeDimensions(n);
    const px = n.position.x;
    const py = n.position.y;
    if (
      flowX >= px &&
      flowX <= px + width &&
      flowY >= py &&
      flowY <= py + height
    ) {
      return n;
    }
  }
  return undefined;
}

/** While remote metadata still references a deleted node, avoid rendering (prevents a flash at the origin). */
function isThreadAttachedToMissingNode(
  thread: ThreadData,
  nodes: WhiteboardNode[]
): boolean {
  const aid = thread.metadata.attachedToNodeId;
  if (!aid) {
    return false;
  }
  return !nodes.some((n) => n.id === aid);
}

function getThreadPinFlowPosition(
  thread: ThreadData,
  nodes: WhiteboardNode[]
): { flowX: number; flowY: number } {
  const nx = typeof thread.metadata.x === "number" ? thread.metadata.x : 0;
  const ny = typeof thread.metadata.y === "number" ? thread.metadata.y : 0;
  const aid = thread.metadata.attachedToNodeId;
  if (aid) {
    const n = nodes.find((node) => node.id === aid);
    if (n) {
      const { width: w, height: h } = getNodeDimensions(n);
      const safeW = Math.max(w, 1);
      const safeH = Math.max(h, 1);
      return {
        flowX: n.position.x + nx * safeW,
        flowY: n.position.y + ny * safeH,
      };
    }
  }
  return { flowX: nx, flowY: ny };
}

function createBlockNode(
  shape: BlockShape,
  position: { x: number; y: number }
): WhiteboardNode {
  return {
    id: `block-${nanoid()}`,
    type: "block",
    position,
    data: {
      label: "",
      shape,
      color: DEFAULT_BLOCK_COLOR,
    },
    width: DEFAULT_BLOCK_SIZE,
    height: DEFAULT_BLOCK_SIZE,
    selected: true,
  };
}

function getPlacementAtFlowPoint(
  nodes: WhiteboardNode[],
  flowPosition: { x: number; y: number }
): ThreadPinPlacement {
  const hit = getBlockNodeAtFlowPoint(nodes, flowPosition.x, flowPosition.y);

  if (!hit) {
    return { kind: "canvas", flow: flowPosition };
  }

  const { nx, ny } = flowPointToNormalizedAttach(
    hit,
    flowPosition.x,
    flowPosition.y
  );

  return {
    kind: "block",
    nodeId: hit.id,
    normalized: { x: nx, y: ny },
  };
}

function useGlobalPointerPosition() {
  const [coords, setCoords] = useState({ x: -10000, y: -10000 });

  useEffect(() => {
    const updatePosition = (event: MouseEvent) => {
      setCoords({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener("pointermove", updatePosition, false);
    document.addEventListener("pointerenter", updatePosition, false);

    return () => {
      document.removeEventListener("pointermove", updatePosition);
      document.removeEventListener("pointerenter", updatePosition);
    };
  }, []);

  return coords;
}

function ShapeIcon({ shape }: { shape: BlockShape }) {
  return <span className="whiteboard-shape-icon" data-shape={shape} />;
}

function BlockDragPreview({ shape }: { shape: BlockShape }) {
  return (
    <div
      className="whiteboard-block-drag-preview"
      style={{
        width: DEFAULT_BLOCK_SIZE,
        height: DEFAULT_BLOCK_SIZE,
      }}
    >
      <div
        className="whiteboard-block"
        style={getBlockStyle(DEFAULT_BLOCK_COLOR)}
        data-shape={getBlockShape(shape)}
      />
    </div>
  );
}

const BlockNode = memo(({ id, data, selected }: NodeProps<WhiteboardNode>) => {
  const { updateNode } = useReactFlow();
  const [labelDraft, setLabelDraft] = useState(data.label);

  useEffect(() => {
    setLabelDraft(data.label);
  }, [data.label]);

  const commitLabel = useCallback(
    (text: string) => {
      const nextLabel = text.trim();

      setLabelDraft(nextLabel);
      updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, label: nextLabel },
      }));
    },
    [id, updateNode]
  );

  const handleShapeChange = useCallback(
    (shape: BlockShape) => {
      updateNode(id, (node) => ({ ...node, data: { ...node.data, shape } }));
    },
    [id, updateNode]
  );

  const handleColorChange = useCallback(
    (color: BlockColor) => {
      updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, color },
      }));
    },
    [id, updateNode]
  );

  const handleResize = useCallback<OnResize>(
    (_resizePointerEvent, { x, y, width, height }) => {
      updateNode(id, (node) => ({
        ...node,
        position: { x, y },
        width,
        height,
      }));
    },
    [id, updateNode]
  );

  return (
    <>
      <NodeToolbar isVisible={selected} className="whiteboard-node-toolbar">
        <div className="whiteboard-node-toolbar-section">
          {BLOCK_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => handleShapeChange(shape)}
              className="whiteboard-node-toolbar-button"
              data-active={data.shape === shape ? "" : undefined}
              title={capitalize(shape)}
              aria-label={`Set shape to ${capitalize(shape)}`}
            >
              <ShapeIcon shape={shape} />
            </button>
          ))}
        </div>
        <div className="whiteboard-node-toolbar-separator" />
        <div className="whiteboard-node-toolbar-section">
          {(Object.keys(BLOCK_COLORS) as BlockColor[]).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorChange(color)}
              className="whiteboard-node-toolbar-color"
              data-active={data.color === color ? "" : undefined}
              style={{ backgroundColor: BLOCK_COLORS[color] }}
              title={capitalize(color)}
            />
          ))}
        </div>
      </NodeToolbar>

      <div
        className="whiteboard-block"
        style={getBlockStyle(data.color)}
        data-shape={getBlockShape(data.shape)}
      >
        <textarea
          className="whiteboard-block-label nodrag"
          value={labelDraft}
          placeholder="Add text"
          rows={1}
          onChange={(event) => setLabelDraft(event.target.value)}
          onBlur={(event) => commitLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.blur();
              return;
            }

            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          spellCheck={false}
        />
      </div>

      <NodeResizer
        minWidth={50}
        minHeight={50}
        isVisible={selected}
        onResize={handleResize}
      />

      {(
        [
          [Position.Top, "top"],
          [Position.Right, "right"],
          [Position.Bottom, "bottom"],
          [Position.Left, "left"],
        ] as const
      ).map(([position, side]) => (
        <Fragment key={side}>
          <Handle
            type="target"
            position={position}
            id={`tgt-${side}`}
            className="whiteboard-handle"
          />
          <Handle
            type="source"
            position={position}
            id={`src-${side}`}
            className="whiteboard-handle"
          />
        </Fragment>
      ))}
    </>
  );
});

const WhiteboardLabelEdge = memo(
  ({
    id,
    data,
    selected,
    markerEnd,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    style,
  }: EdgeProps<WhiteboardEdge>) => {
    const { updateEdge } = useReactFlow();
    const [labelDraft, setLabelDraft] = useState(data?.label ?? "");
    const [edgeChromeHovered, setEdgeChromeHovered] = useState(false);
    const [labelFocused, setLabelFocused] = useState(false);
    const edgeGroupRef = useRef<SVGGElement>(null);
    const labelShellRef = useRef<HTMLDivElement>(null);
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0,
    });

    useEffect(() => {
      setLabelDraft(data?.label ?? "");
    }, [data?.label]);

    const pointerWithinLabelChrome = useCallback(
      (target: EventTarget | null) => {
        if (target == null || !(target instanceof Node)) {
          return false;
        }

        return (
          (edgeGroupRef.current?.contains(target) ?? false) ||
          (labelShellRef.current?.contains(target) ?? false)
        );
      },
      []
    );

    const handleChromePointerEnter = useCallback(() => {
      setEdgeChromeHovered(true);
    }, []);

    const handleChromePointerLeave = useCallback(
      (event: ReactPointerEvent) => {
        if (pointerWithinLabelChrome(event.relatedTarget)) {
          return;
        }

        setEdgeChromeHovered(false);
      },
      [pointerWithinLabelChrome]
    );

    const commitLabel = useCallback(
      (text: string) => {
        const nextLabel = text.trim();

        setLabelDraft(nextLabel);
        updateEdge(id, (edge) => ({
          ...edge,
          data: {
            label: nextLabel,
          },
        }));
      },
      [id, updateEdge]
    );

    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.blur();
        }
      },
      []
    );

    const showLabelChrome = selected || edgeChromeHovered || labelFocused;
    const trimmedLabel = labelDraft.trim();

    const mirrorText = useMemo(
      () => (labelDraft.length > 0 ? labelDraft : "Add label"),
      [labelDraft]
    );

    return (
      <>
        <g
          ref={edgeGroupRef}
          onPointerEnter={handleChromePointerEnter}
          onPointerLeave={handleChromePointerLeave}
        >
          <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        </g>
        <EdgeLabelRenderer>
          <div
            ref={labelShellRef}
            className="whiteboard-edge-label-shell nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            onPointerEnter={handleChromePointerEnter}
            onPointerLeave={handleChromePointerLeave}
          >
            {showLabelChrome ? (
              <div className="whiteboard-edge-label-sizing">
                <span className="whiteboard-edge-label-mirror" aria-hidden>
                  {mirrorText}
                </span>
                <input
                  className="whiteboard-edge-label"
                  value={labelDraft}
                  placeholder="Add label"
                  onChange={(event) => setLabelDraft(event.target.value)}
                  onFocus={(event) => {
                    setLabelFocused(true);
                    event.currentTarget.select();
                  }}
                  onBlur={(event) => {
                    commitLabel(event.target.value);
                    setLabelFocused(false);
                  }}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                />
              </div>
            ) : trimmedLabel ? (
              <span
                className="whiteboard-edge-label-readonly"
                title={trimmedLabel}
              >
                {trimmedLabel}
              </span>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

const MiniMapNode = memo(
  ({ id, x: boundsX, y: boundsY, width, height, color }: MiniMapNodeProps) => {
    const nodes = useNodes<WhiteboardNode>();
    const nodeData = nodes.find((node) => node.id === id)?.data;
    const shape = getBlockShape(nodeData?.shape);

    if (shape === "circle") {
      return (
        <ellipse
          cx={boundsX + width / 2}
          cy={boundsY + height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={color}
        />
      );
    }

    return (
      <rect
        x={boundsX}
        y={boundsY}
        width={width}
        height={height}
        rx={shape === "rounded" ? Math.min(width, height) / 2 : 2}
        fill={color}
      />
    );
  }
);

function DraggableFlowThread({
  thread,
  defaultOpen,
}: {
  thread: ThreadData;
  defaultOpen: boolean;
}) {
  const nodes = useNodes<WhiteboardNode>();
  const transform = useStore((state) => state.transform);
  const [panX, panY, zoom] = transform;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform: dragDelta,
  } = useDraggable({
    id: thread.id,
    data: { thread },
  });

  const { flowX, flowY } = useMemo(
    () => getThreadPinFlowPosition(thread, nodes),
    [thread, nodes]
  );

  const x = flowX * zoom + panX + (dragDelta?.x ?? 0);
  const y = flowY * zoom + panY + (dragDelta?.y ?? 0);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  if (isThreadAttachedToMissingNode(thread, nodes)) {
    return null;
  }

  return (
    <FloatingThread
      thread={thread}
      open={isOpen}
      onOpenChange={setIsOpen}
      defaultOpen={defaultOpen}
      side="right"
      style={{ pointerEvents: isDragging ? "none" : "auto" }}
    >
      <div
        ref={setNodeRef}
        className="whiteboard-flow-comment-pin-wrap nodrag nopan"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          pointerEvents: "auto",
        }}
        onWheel={handleWheel}
      >
        <CommentPin
          userId={thread.comments[0]?.userId}
          corner="top-left"
          {...listeners}
          {...attributes}
        />
      </div>
    </FloatingThread>
  );
}

function NewThreadCursor() {
  const coords = useGlobalPointerPosition();

  return (
    <CommentPin
      corner="top-left"
      style={{
        cursor: "none",
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${coords.x}px, ${coords.y}px)`,
        zIndex: 999999,
        pointerEvents: "none",
      }}
    />
  );
}

function NewShapeCursor({ shape }: { shape: BlockShape }) {
  const coords = useGlobalPointerPosition();

  return (
    <div
      className="whiteboard-shape-place-cursor"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${coords.x - DEFAULT_BLOCK_SIZE / 2}px, ${coords.y - DEFAULT_BLOCK_SIZE / 2}px)`,
        zIndex: 999999,
        pointerEvents: "none",
        cursor: "none",
      }}
    >
      <BlockDragPreview shape={shape} />
    </div>
  );
}

function PlaceThreadControl({
  placingState,
  onPlacingStateChange,
  placement,
  pendingShape,
  onThreadCreated,
}: {
  placingState: PlacementState;
  onPlacingStateChange: (state: PlacementState) => void;
  placement: ThreadPinPlacement | null;
  pendingShape: BlockShape | null;
  onThreadCreated: (threadId: string) => void;
}) {
  return (
    <>
      {pendingShape ? <NewShapeCursor shape={pendingShape} /> : null}
      {placingState === "placing" ? <NewThreadCursor /> : null}
      {placingState === "placed" && placement ? (
        <ThreadComposer
          placement={placement}
          onSubmit={() => onPlacingStateChange("initial")}
          onThreadCreated={onThreadCreated}
        />
      ) : null}
    </>
  );
}

function ThreadComposer({
  placement,
  onSubmit,
  onThreadCreated,
}: {
  placement: ThreadPinPlacement;
  onSubmit: () => void;
  onThreadCreated: (threadId: string) => void;
}) {
  const createThread = useCreateThread();
  const creatorId = useSelf((me) => me.id);
  const nodes = useNodes<WhiteboardNode>();
  const transform = useStore((state) => state.transform);
  const [panX, panY, zoom] = transform;

  const composerMetadata = useMemo(() => {
    if (placement.kind === "canvas") {
      const { x, y } = placement.flow;

      return { x, y } as const;
    }

    return {
      x: placement.normalized.x,
      y: placement.normalized.y,
      attachedToNodeId: placement.nodeId,
    } as const;
  }, [placement]);

  const { x, y } = useMemo(() => {
    if (placement.kind === "canvas") {
      const { x: fx, y: fy } = placement.flow;

      return {
        x: fx * zoom + panX,
        y: fy * zoom + panY,
      };
    }

    const n = nodes.find((node) => node.id === placement.nodeId);

    if (n) {
      const { flowX: absX, flowY: absY } = normalizedAttachToFlowPoint(
        n,
        placement.normalized.x,
        placement.normalized.y
      );

      return {
        x: absX * zoom + panX,
        y: absY * zoom + panY,
      };
    }
    return { x: 0, y: 0 };
  }, [placement, nodes, zoom, panX, panY]);

  return (
    <div
      className="whiteboard-thread-composer-anchor nodrag nopan"
      style={{
        position: "absolute",
        top: y,
        left: x,
        pointerEvents: "auto",
      }}
    >
      <FloatingComposer
        defaultOpen
        metadata={composerMetadata}
        onComposerSubmit={(comment, event) => {
          event.preventDefault();

          const thread = createThread({
            body: comment.body,
            metadata: composerMetadata,
            attachments: comment.attachments,
          });

          onThreadCreated(thread.id);
          onSubmit();
        }}
        onOpenChange={(open) => {
          if (!open) {
            onSubmit();
          }
        }}
        side="right"
      >
        <div className="whiteboard-flow-comment-pin-wrap nodrag nopan">
          <CommentPin
            userId={creatorId ?? undefined}
            corner="top-left"
            className="nodrag nopan"
            style={{ pointerEvents: "none" }}
          />
        </div>
      </FloatingComposer>
    </div>
  );
}

function WhiteboardCanvasDnd({
  children,
  placingState,
  onPlacingStateChange,
  placement,
  pendingShape,
}: {
  children: ReactNode;
  placingState: PlacementState;
  onPlacingStateChange: (state: PlacementState) => void;
  placement: ThreadPinPlacement | null;
  pendingShape: BlockShape | null;
}) {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();
  const storeApi = useStoreApi<WhiteboardNode, WhiteboardEdge>();
  const [threadIdsOpenByDefault, setThreadIdsOpenByDefault] = useState(
    () => new Set<string>()
  );

  const registerThreadOpenByDefault = useCallback((threadId: string) => {
    setThreadIdsOpenByDefault((prev) => new Set(prev).add(threadId));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const data = active.data.current;
      const thread = data?.thread as ThreadData | undefined;

      if (thread) {
        const [, , zoom] = storeApi.getState().transform;
        const nodes = storeApi.getState().nodes;
        const dx = delta.x / zoom;
        const dy = delta.y / zoom;

        const { flowX: startFx, flowY: startFy } = getThreadPinFlowPosition(
          thread,
          nodes
        );
        const finalFlowX = startFx + dx;
        const finalFlowY = startFy + dy;

        const hit = getBlockNodeAtFlowPoint(nodes, finalFlowX, finalFlowY);

        if (hit) {
          const { nx, ny } = flowPointToNormalizedAttach(
            hit,
            finalFlowX,
            finalFlowY
          );

          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: hit.id,
              x: nx,
              y: ny,
            },
          });
        } else {
          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: null,
              x: finalFlowX,
              y: finalFlowY,
            },
          });
        }
      }
    },
    [editThreadMetadata, storeApi]
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
      <div className="whiteboard-comments">
        {threads.map((thread) => (
          <DraggableFlowThread
            key={thread.id}
            thread={thread}
            defaultOpen={threadIdsOpenByDefault.has(thread.id)}
          />
        ))}
        <PlaceThreadControl
          placingState={placingState}
          onPlacingStateChange={onPlacingStateChange}
          placement={placement}
          pendingShape={pendingShape}
          onThreadCreated={registerThreadOpenByDefault}
        />
      </div>
    </DndContext>
  );
}

function ToolbarShapeItem({
  shape,
  onSelectForPlacement,
  isActive,
}: {
  shape: BlockShape;
  onSelectForPlacement: (shape: BlockShape) => void;
  isActive: boolean;
}) {
  const label = capitalize(shape);

  return (
    <button
      type="button"
      className={clsx(
        "whiteboard-toolbar-item whiteboard-toolbar-item--shape",
        isActive && "whiteboard-toolbar-item--active-tool"
      )}
      data-active-tool={isActive ? "" : undefined}
      onClick={() => onSelectForPlacement(shape)}
      title={`Place ${label} — click the canvas to add (Escape to cancel)`}
    >
      <ShapeIcon shape={shape} />
      <span>{label}</span>
    </button>
  );
}

function FlowToolbar({
  pendingShape,
  onSelectShapeForPlacement,
  onAddComment,
  placingState,
}: {
  pendingShape: BlockShape | null;
  onSelectShapeForPlacement: (shape: BlockShape) => void;
  onAddComment: () => void;
  placingState: PlacementState;
}) {
  return (
    <div className="whiteboard-toolbar">
      {BLOCK_SHAPES.map((shape) => (
        <ToolbarShapeItem
          key={shape}
          shape={shape}
          onSelectForPlacement={onSelectShapeForPlacement}
          isActive={pendingShape === shape}
        />
      ))}
      <div className="whiteboard-toolbar-separator" />
      <button
        type="button"
        className={clsx(
          "whiteboard-toolbar-item whiteboard-toolbar-item--comment",
          placingState === "placing" && "whiteboard-toolbar-item--active-tool"
        )}
        title="Add comment pin — click the canvas to place (Escape to cancel)"
        aria-label="Add comment pin"
        data-active-tool={placingState === "placing" ? "" : undefined}
        onClick={onAddComment}
      >
        <span className="whiteboard-shape-icon">💬</span>
        Comment
      </button>
    </div>
  );
}

function Flow({ className, ...props }: ComponentProps<"div">) {
  const didReconnectRef = useRef(false);
  const reactFlow = useReactFlow<WhiteboardNode, WhiteboardEdge>();
  const [placingState, setPlacingState] = useState<PlacementState>("initial");
  const [placement, setPlacement] = useState<ThreadPinPlacement | null>(null);
  const [pendingShape, setPendingShape] = useState<BlockShape | null>(null);
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow<WhiteboardNode, WhiteboardEdge>({
      initial: { nodes: INITIAL_NODES, edges: INITIAL_EDGES },
    });

  const isPlacementMode = pendingShape !== null || placingState === "placing";

  useEffect(() => {
    if (placingState === "initial") {
      setPlacement(null);
    }
  }, [placingState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (pendingShape !== null) {
        setPendingShape(null);
      }

      if (placingState !== "initial") {
        setPlacingState("initial");
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pendingShape, placingState]);

  const commitThreadPlacementAtScreenPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (placingState !== "placing") {
        return;
      }

      const flowPosition = reactFlow.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      setPlacement(getPlacementAtFlowPoint(reactFlow.getNodes(), flowPosition));
      setPlacingState("placed");
    },
    [placingState, reactFlow]
  );

  const handlePaneClickWhilePlacing = useCallback(
    (event: ReactMouseEvent) => {
      if (placingState !== "placing") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      commitThreadPlacementAtScreenPoint(event.clientX, event.clientY);
    },
    [placingState, commitThreadPlacementAtScreenPoint]
  );

  const handleNodeClickWhilePlacing = useCallback(
    (event: ReactMouseEvent, node: WhiteboardNode) => {
      if (placingState !== "placing" || node.type !== "block") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      commitThreadPlacementAtScreenPoint(event.clientX, event.clientY);
    },
    [placingState, commitThreadPlacementAtScreenPoint]
  );

  const addBlockAtPosition = useCallback(
    (shape: BlockShape, position: { x: number; y: number }) => {
      const deselectChanges: NodeChange<WhiteboardNode>[] = (nodes ?? [])
        .filter((node) => node.selected)
        .map((node) => ({
          type: "select",
          id: node.id,
          selected: false,
        }));

      onNodesChange([
        ...deselectChanges,
        { type: "add", item: createBlockNode(shape, position) },
      ]);
    },
    [nodes, onNodesChange]
  );

  const commitShapeAtScreenPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (pendingShape === null) {
        return;
      }

      const flowPosition = reactFlow.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });
      const half = DEFAULT_BLOCK_SIZE / 2;

      addBlockAtPosition(pendingShape, {
        x: flowPosition.x - half,
        y: flowPosition.y - half,
      });
      setPendingShape(null);
    },
    [pendingShape, addBlockAtPosition]
  );

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent) => {
      if (pendingShape !== null) {
        event.preventDefault();
        event.stopPropagation();

        commitShapeAtScreenPoint(event.clientX, event.clientY);

        return;
      }

      handlePaneClickWhilePlacing(event);
    },
    [pendingShape, commitShapeAtScreenPoint, handlePaneClickWhilePlacing]
  );

  const handleNodeClick = useCallback(
    (event: ReactMouseEvent, node: WhiteboardNode) => {
      if (pendingShape !== null) {
        event.preventDefault();
        event.stopPropagation();

        commitShapeAtScreenPoint(event.clientX, event.clientY);

        return;
      }

      handleNodeClickWhilePlacing(event, node);
    },
    [pendingShape, commitShapeAtScreenPoint, handleNodeClickWhilePlacing]
  );

  const onNodesChangeWithThreadDetach = useCallback(
    (changes: NodeChange<WhiteboardNode>[]) => {
      const removedIds = changes
        .filter(
          (change): change is NodeRemoveChange => change.type === "remove"
        )
        .map((change) => change.id);

      if (removedIds.length > 0) {
        const currentNodes = reactFlow.getNodes();

        for (const thread of threads) {
          const aid = thread.metadata.attachedToNodeId;

          if (!aid || !removedIds.includes(aid)) {
            continue;
          }

          const node = currentNodes.find((n) => n.id === aid);

          if (!node) {
            continue;
          }

          const nx =
            typeof thread.metadata.x === "number" ? thread.metadata.x : 0;
          const ny =
            typeof thread.metadata.y === "number" ? thread.metadata.y : 0;

          const { flowX, flowY } = normalizedAttachToFlowPoint(node, nx, ny);

          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: null,
              x: flowX,
              y: flowY,
            },
          });
        }
      }
      onNodesChange(changes);
    },
    [threads, onNodesChange, editThreadMetadata]
  );

  const onReconnect = useCallback(
    (oldEdge: WhiteboardEdge, newConnection: Connection) => {
      didReconnectRef.current = true;

      // Remove old edge and add updated one while preserving its properties
      onEdgesChange([
        { type: "remove", id: oldEdge.id },
        {
          type: "add",
          item: {
            ...oldEdge,
            id: `e-${newConnection.source}-${newConnection.target}-${nanoid()}`,
            source: newConnection.source ?? oldEdge.source,
            target: newConnection.target ?? oldEdge.target,
            sourceHandle: newConnection.sourceHandle ?? null,
            targetHandle: newConnection.targetHandle ?? null,
            selected: false,
          },
        },
      ]);
    },
    [onEdgesChange]
  );

  const onReconnectEnd = useCallback(
    (_pointerEvent: MouseEvent | TouchEvent, edge: WhiteboardEdge) => {
      // If onReconnect wasn't called (dropped on empty canvas), remove the edge
      if (!didReconnectRef.current) {
        onEdgesChange([{ type: "remove", id: edge.id }]);
      }

      didReconnectRef.current = false;
    },
    [onEdgesChange]
  );

  return (
    <div
      className={clsx(
        "relative w-full h-full",
        isPlacementMode && "whiteboard--placement-mode",
        className
      )}
      {...props}
    >
      <ReactFlow
        className="whiteboard"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWithThreadDetach}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onNodeClick={handleNodeClick}
        onPaneContextMenu={(event) => {
          if (!isPlacementMode) {
            return;
          }

          event.preventDefault();

          setPlacement(null);
          setPendingShape(null);
          setPlacingState("initial");
        }}
        nodeTypes={{ block: BlockNode }}
        edgeTypes={{ smoothstep: WhiteboardLabelEdge }}
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Step}
        panOnScroll
        panOnDrag={[1]}
        elementsSelectable={!isPlacementMode}
        selectionOnDrag={!isPlacementMode}
        selectionMode={SelectionMode.Partial}
        fitView
        edgesReconnectable
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
      >
        <WhiteboardCanvasDnd
          placingState={placingState}
          onPlacingStateChange={setPlacingState}
          placement={placement}
          pendingShape={pendingShape}
        >
          <Cursors />
          <Controls />
          <MiniMap
            nodeComponent={MiniMapNode}
            nodeColor={(node) =>
              getBlockColor((node.data as BlockNodeData)?.color)
            }
            nodeStrokeWidth={0}
          />
          <Panel position="bottom-center">
            <FlowToolbar
              pendingShape={pendingShape}
              onSelectShapeForPlacement={(shape) => {
                setPlacement(null);
                setPlacingState("initial");
                setPendingShape(shape);
              }}
              onAddComment={() => {
                setPendingShape(null);
                setPlacingState("placing");
              }}
              placingState={placingState}
            />
          </Panel>
          <Panel position="top-right">
            <div className="whiteboard-avatar-stack">
              <AvatarStack size={32} gap={3} />
            </div>
          </Panel>
          <Background />
        </WhiteboardCanvasDnd>
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <div className="relative h-screen w-screen flex flex-col bg-[#f7f9fb]">
      <RoomProvider id={EXAMPLES.whiteboard.roomId}>
        <ReactFlowProvider>
          <ClientSideSuspense
            fallback={
              <div className="flex-1 w-full h-full flex items-center justify-center">
                <img
                  src="https://liveblocks.io/loading.svg"
                  alt="Loading"
                  className="size-16 opacity-20"
                />
              </div>
            }
          >
            <Flow className="flex-1" />
          </ClientSideSuspense>
        </ReactFlowProvider>
      </RoomProvider>
    </div>
  );
}
