"use client";

import type { ThreadData } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RoomProvider,
  useOther,
  useRoom,
  useSelf,
  useUser,
} from "@liveblocks/react";
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
  type EdgeProps,
  type MiniMapNodeProps,
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
  Cursor,
} from "@liveblocks/react-ui";
import { CursorsCursorProps } from "@liveblocks/react-flow";
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
  useActionState,
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
import { EXAMPLES } from "@/app/examples";
import {
  BLOCK_COLORS,
  BLOCK_SHAPES,
  DEFAULT_BLOCK_COLOR,
  DEFAULT_BLOCK_SIZE,
  FLOWCHART_EDGE_TYPE,
  createFlowchartEdge,
  createFlowchartNode,
  blockSourceHandleId,
  blockTargetHandleId,
  flowPointToNormalized,
  getBlockColor,
  getNodeAtFlowPoint,
  getBlockShape,
  normalizedToFlowPoint,
  type BlockColor,
  type BlockHandleSide,
  type BlockShape,
  type FlowchartNode,
  type FlowchartEdge,
  capitalize,
  FLOWCHART_STORAGE_KEY,
  Point,
} from "./shared";
import { submitFlowchartAgentAction } from "./agent";
import "./flowchart.css";

type ThreadPinPlacement =
  | { kind: "canvas"; flow: Point }
  | {
      kind: "block";
      nodeId: string;
      normalized: Point;
    };

type PlacementMode =
  | { kind: "idle" }
  | { kind: "placing-shape"; shape: BlockShape }
  | { kind: "placing-comment" }
  | { kind: "composing-comment"; placement: ThreadPinPlacement };

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

const INITIAL_NODE_SPECS = [
  {
    id: "brainstorm",
    label: "Brainstorm",
    shape: "rectangle",
    color: "blue",
    horizontal: "center",
    vertical: 0,
  },
  {
    id: "new-product",
    label: "Idea",
    shape: "circle",
    color: "cyan",
    horizontal: "center",
    vertical: 1,
  },
  {
    id: "prototype",
    label: "Prototype",
    shape: "rounded",
    color: "purple",
    horizontal: "center",
    vertical: 2,
  },
  {
    id: "refinement",
    label: "Refinement",
    shape: "rectangle",
    color: "gray",
    horizontal: "left",
    vertical: 3,
  },
  {
    id: "design",
    label: "Design",
    shape: "rectangle",
    color: "green",
    horizontal: "right",
    vertical: 3,
  },
  {
    id: "testing",
    label: "Testing",
    shape: "circle",
    color: "red",
    horizontal: "right",
    vertical: 4,
  },
  {
    id: "production",
    label: "Production",
    shape: "rectangle",
    color: "yellow",
    horizontal: "right",
    vertical: 5,
  },
  {
    id: "launch",
    label: "Launch",
    shape: "rounded",
    color: "orange",
    horizontal: "right",
    vertical: 6,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  shape: BlockShape;
  color: BlockColor;
  horizontal: "left" | "center" | "right";
  vertical: number;
}>;

const INITIAL_EDGE_SPECS = [
  {
    id: "e-brainstorm-new-product",
    source: "brainstorm",
    target: "new-product",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-new-product-prototype",
    source: "new-product",
    target: "prototype",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-prototype-refinement",
    source: "prototype",
    target: "refinement",
    sourceHandle: "src-left",
    targetHandle: "tgt-top",
    label: "Not ready",
  },
  {
    id: "e-prototype-design",
    source: "prototype",
    target: "design",
    sourceHandle: "src-right",
    targetHandle: "tgt-top",
    label: "Approved",
  },
  {
    id: "e-refinement-design",
    source: "refinement",
    target: "design",
    sourceHandle: "src-right",
    targetHandle: "tgt-left",
  },
  {
    id: "e-design-testing",
    source: "design",
    target: "testing",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-testing-refinement",
    source: "testing",
    target: "refinement",
    sourceHandle: "src-left",
    targetHandle: "tgt-bottom",
    label: "Needs improvement",
  },
  {
    id: "e-testing-production",
    source: "testing",
    target: "production",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
  {
    id: "e-production-launch",
    source: "production",
    target: "launch",
    sourceHandle: "src-bottom",
    targetHandle: "tgt-top",
  },
] as const;

const INITIAL_NODES: FlowchartNode[] = INITIAL_NODE_SPECS.map((node) => {
  const layout = getInitialNodeLayout(
    node.shape,
    node.horizontal,
    node.vertical
  );

  return createFlowchartNode({
    id: node.id,
    position: layout.position,
    width: layout.width,
    height: layout.height,
    label: node.label,
    shape: node.shape,
    color: node.color,
  });
});

const INITIAL_EDGES: FlowchartEdge[] = INITIAL_EDGE_SPECS.map((edge) =>
  createFlowchartEdge(edge)
);

function getBlockStyle(color: BlockColor | undefined): CSSProperties {
  return {
    "--flowchart-block-color": getBlockColor(color),
  } as CSSProperties;
}

function isThreadAttachedToMissingNode(
  thread: ThreadData,
  nodes: FlowchartNode[]
): boolean {
  const attachedToNodeId = thread.metadata.attachedToNodeId;

  if (attachedToNodeId == null) {
    return false;
  }

  return !nodes.some((node) => node.id === attachedToNodeId);
}

function getThreadPinFlowPosition(
  thread: ThreadData,
  nodes: FlowchartNode[]
): Point {
  const { x, y, attachedToNodeId } = thread.metadata;

  if (attachedToNodeId != null) {
    const node = nodes.find((node) => node.id === attachedToNodeId);

    if (node) {
      return normalizedToFlowPoint(node, { x, y });
    }
  }

  return { x, y };
}

function getPlacementAtFlowPoint(
  nodes: FlowchartNode[],
  flowPosition: { x: number; y: number }
): ThreadPinPlacement {
  const hit = getNodeAtFlowPoint(nodes, flowPosition);

  if (!hit) {
    return { kind: "canvas", flow: flowPosition };
  }

  const normalized = flowPointToNormalized(hit, flowPosition.x, flowPosition.y);

  return {
    kind: "block",
    nodeId: hit.id,
    normalized,
  };
}

function getThreadMetadataForPlacement(
  placement: ThreadPinPlacement
): ThreadData["metadata"] {
  if (placement.kind === "canvas") {
    return {
      x: placement.flow.x,
      y: placement.flow.y,
    };
  }

  return {
    attachedToNodeId: placement.nodeId,
    x: placement.normalized.x,
    y: placement.normalized.y,
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
  return <span className="flowchart-shape-icon" data-shape={shape} />;
}

function BlockDragPreview({ shape }: { shape: BlockShape }) {
  return (
    <div
      className="flowchart-block-drag-preview"
      style={{
        width: DEFAULT_BLOCK_SIZE,
        height: DEFAULT_BLOCK_SIZE,
      }}
    >
      <div
        className="flowchart-block"
        style={getBlockStyle(DEFAULT_BLOCK_COLOR)}
        data-shape={getBlockShape(shape)}
      />
    </div>
  );
}

const BlockNode = memo(({ id, data, selected }: NodeProps<FlowchartNode>) => {
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
    (_, { x, y, width, height }) => {
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
      <NodeToolbar isVisible={selected} className="flowchart-node-toolbar">
        <div className="flowchart-node-toolbar-section">
          {BLOCK_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => handleShapeChange(shape)}
              className="flowchart-node-toolbar-button"
              data-active={data.shape === shape ? "" : undefined}
              title={capitalize(shape)}
              aria-label={`Set shape to ${capitalize(shape)}`}
            >
              <ShapeIcon shape={shape} />
            </button>
          ))}
        </div>
        <div className="flowchart-node-toolbar-separator" />
        <div className="flowchart-node-toolbar-section">
          {(Object.keys(BLOCK_COLORS) as BlockColor[]).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorChange(color)}
              className="flowchart-node-toolbar-color"
              data-active={data.color === color ? "" : undefined}
              style={{ backgroundColor: BLOCK_COLORS[color] }}
              title={capitalize(color)}
            />
          ))}
        </div>
      </NodeToolbar>

      <div
        className="flowchart-block"
        style={getBlockStyle(data.color)}
        data-shape={getBlockShape(data.shape)}
      >
        <textarea
          className="flowchart-block-label nodrag"
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
        ] as const satisfies ReadonlyArray<readonly [Position, BlockHandleSide]>
      ).map(([position, side]) => (
        <Fragment key={side}>
          <Handle
            type="target"
            position={position}
            id={blockTargetHandleId(side)}
            className="flowchart-handle"
          />
          <Handle
            type="source"
            position={position}
            id={blockSourceHandleId(side)}
            className="flowchart-handle"
          />
        </Fragment>
      ))}
    </>
  );
});

const FlowchartLabelEdge = memo(
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
  }: EdgeProps<FlowchartEdge>) => {
    const { updateEdge } = useReactFlow();
    const [labelDraft, setLabelDraft] = useState(data?.label ?? "");
    const [isEdgeHovered, setEdgeHovered] = useState(false);
    const [labelFocused, setLabelFocused] = useState(false);
    const showLabel = selected || isEdgeHovered || labelFocused;
    const trimmedLabel = labelDraft.trim();
    const edgeGroupRef = useRef<SVGGElement>(null);
    const labelContainerRef = useRef<HTMLDivElement>(null);
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

    const isPointerWithinLabel = useCallback((target: EventTarget | null) => {
      if (target == null || !(target instanceof Node)) {
        return false;
      }

      return (
        (edgeGroupRef.current?.contains(target) ?? false) ||
        (labelContainerRef.current?.contains(target) ?? false)
      );
    }, []);

    const handlePointerEnter = useCallback(() => {
      setEdgeHovered(true);
    }, []);

    const handlePointerLeave = useCallback(
      (event: ReactPointerEvent) => {
        if (isPointerWithinLabel(event.relatedTarget)) {
          return;
        }

        setEdgeHovered(false);
      },
      [isPointerWithinLabel]
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

    return (
      <>
        <g
          ref={edgeGroupRef}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        </g>
        <EdgeLabelRenderer>
          <div
            ref={labelContainerRef}
            className="flowchart-edge-label-container nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            {showLabel ? (
              <div className="flowchart-edge-label-sizing">
                <span className="flowchart-edge-label-sizing-text" aria-hidden>
                  {labelDraft.length > 0 ? labelDraft : "Add label"}
                </span>
                <input
                  className="flowchart-edge-label"
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
                className="flowchart-edge-label-readonly"
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
    const nodes = useNodes<FlowchartNode>();
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
  const nodes = useNodes<FlowchartNode>();
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

  const { x: flowX, y: flowY } = useMemo(
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
        className="flowchart-flow-comment-pin-wrap nodrag nopan"
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
      className="flowchart-shape-place-cursor"
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
  mode,
  onCancel,
  onThreadCreated,
}: {
  mode: PlacementMode;
  onCancel: () => void;
  onThreadCreated: (threadId: string) => void;
}) {
  return (
    <>
      {mode.kind === "placing-shape" ? (
        <NewShapeCursor shape={mode.shape} />
      ) : null}
      {mode.kind === "placing-comment" ? <NewThreadCursor /> : null}
      {mode.kind === "composing-comment" ? (
        <ThreadComposer
          placement={mode.placement}
          onSubmit={onCancel}
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
  const nodes = useNodes<FlowchartNode>();
  const transform = useStore((state) => state.transform);
  const [panX, panY, zoom] = transform;

  const composerMetadata = useMemo(
    () => getThreadMetadataForPlacement(placement),
    [placement]
  );

  const { x, y } = useMemo(() => {
    if (placement.kind === "canvas") {
      return {
        x: placement.flow.x * zoom + panX,
        y: placement.flow.y * zoom + panY,
      };
    }

    const node = nodes.find((item) => item.id === placement.nodeId);

    if (node) {
      const point = normalizedToFlowPoint(node, placement.normalized);

      return {
        x: point.x * zoom + panX,
        y: point.y * zoom + panY,
      };
    }

    return { x: 0, y: 0 };
  }, [placement, nodes, zoom, panX, panY]);

  return (
    <div
      className="flowchart-thread-composer-anchor nodrag nopan"
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
        <div className="flowchart-flow-comment-pin-wrap nodrag nopan">
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

function FlowchartCanvasDnd({
  children,
  mode,
  onCancelPlacement,
}: {
  children: ReactNode;
  mode: PlacementMode;
  onCancelPlacement: () => void;
}) {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();
  const storeApi = useStoreApi<FlowchartNode, FlowchartEdge>();
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

        const start = getThreadPinFlowPosition(thread, nodes);
        const finalFlowPosition = { x: start.x + dx, y: start.y + dy };

        const hit = getNodeAtFlowPoint(nodes, finalFlowPosition);

        if (hit) {
          const normalized = flowPointToNormalized(
            hit,
            finalFlowPosition.x,
            finalFlowPosition.y
          );

          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: hit.id,
              x: normalized.x,
              y: normalized.y,
            },
          });
        } else {
          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: undefined,
              x: finalFlowPosition.x,
              y: finalFlowPosition.y,
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
      <div className="flowchart-comments">
        {threads.map((thread) => (
          <DraggableFlowThread
            key={thread.id}
            thread={thread}
            defaultOpen={threadIdsOpenByDefault.has(thread.id)}
          />
        ))}
        <PlaceThreadControl
          mode={mode}
          onCancel={onCancelPlacement}
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
  return (
    <button
      type="button"
      className="flowchart-toolbar-item flowchart-toolbar-item-shape"
      data-active={isActive ? "" : undefined}
      onClick={() => onSelectForPlacement(shape)}
      title={`Place ${shape}`}
    >
      <ShapeIcon shape={shape} />
      <span>{capitalize(shape)}</span>
    </button>
  );
}

function FlowToolbar({
  mode,
  onSelectShapeForPlacement,
  onAddComment,
}: {
  mode: PlacementMode;
  onSelectShapeForPlacement: (shape: BlockShape) => void;
  onAddComment: () => void;
}) {
  return (
    <div className="flowchart-toolbar">
      {BLOCK_SHAPES.map((shape) => (
        <ToolbarShapeItem
          key={shape}
          shape={shape}
          onSelectForPlacement={onSelectShapeForPlacement}
          isActive={mode.kind === "placing-shape" && mode.shape === shape}
        />
      ))}
      <div className="flowchart-toolbar-separator" />
      <button
        type="button"
        className="flowchart-toolbar-item flowchart-toolbar-item-comment"
        title="Add comment"
        aria-label="Add comment"
        data-active={mode.kind === "placing-comment" ? "" : undefined}
        onClick={onAddComment}
      >
        <span className="flowchart-shape-icon">💬</span>
        Comment
      </button>
    </div>
  );
}

function FlowCursor({ userId, connectionId }: CursorsCursorProps) {
  const { user, isLoading } = useUser(userId);
  const isThinking = useOther(connectionId, (other) => other.presence.thinking);

  if (isLoading) {
    return null;
  }

  return (
    <Cursor
      className="flowchart-cursor"
      color={user?.color}
      label={
        user ? (
          <>
            {isThinking ? (
              <span className="flowchart-agent-cursor-thinking">Thinking…</span>
            ) : (
              user.name
            )}
          </>
        ) : undefined
      }
    />
  );
}

function Flow({ className, ...props }: ComponentProps<"div">) {
  const didReconnectRef = useRef(false);
  const reactFlow = useReactFlow<FlowchartNode, FlowchartEdge>();
  const [placementMode, setPlacementMode] = useState<PlacementMode>({
    kind: "idle",
  });
  const isPlacing = placementMode.kind !== "idle";
  const { threads } = useThreads();
  const roomId = useRoom().id;
  const editThreadMetadata = useEditThreadMetadata();
  const [agentPrompt, setAgentPrompt] = useState("");
  const trimmedAgentPrompt = agentPrompt.trim();
  const [agentState, formAction, isAgentPending] = useActionState(
    submitFlowchartAgentAction,
    null
  );
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow<FlowchartNode, FlowchartEdge>({
      nodes: { initial: INITIAL_NODES },
      edges: { initial: INITIAL_EDGES },
      storageKey: FLOWCHART_STORAGE_KEY,
    });

  const resetPlacementMode = useCallback(() => {
    setPlacementMode({ kind: "idle" });
  }, []);

  useEffect(() => {
    if (agentState?.ok === true) {
      setAgentPrompt("");
    }
  }, [agentState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (placementMode.kind !== "idle") {
        resetPlacementMode();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [placementMode.kind, resetPlacementMode]);

  const commitThreadPlacementAtScreenPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (placementMode.kind !== "placing-comment") {
        return;
      }

      const flowPosition = reactFlow.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      setPlacementMode({
        kind: "composing-comment",
        placement: getPlacementAtFlowPoint(reactFlow.getNodes(), flowPosition),
      });
    },
    [placementMode.kind, reactFlow]
  );

  const addBlockAtPosition = useCallback(
    (shape: BlockShape, position: Point) => {
      const deselectChanges: NodeChange<FlowchartNode>[] = (nodes ?? [])
        .filter((node) => node.selected)
        .map((node) => ({
          type: "select",
          id: node.id,
          selected: false,
        }));

      onNodesChange([
        ...deselectChanges,
        {
          type: "add",
          item: createFlowchartNode({
            id: `block-${nanoid()}`,
            position,
            shape,
            color: DEFAULT_BLOCK_COLOR,
            selected: true,
          }),
        },
      ]);
    },
    [nodes, onNodesChange]
  );

  const handleCanvasClickForPlacement = useCallback(
    (event: ReactMouseEvent) => {
      if (placementMode.kind === "idle") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const flowPosition = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (placementMode.kind === "placing-shape") {
        const half = DEFAULT_BLOCK_SIZE / 2;

        addBlockAtPosition(placementMode.shape, {
          x: flowPosition.x - half,
          y: flowPosition.y - half,
        });
        resetPlacementMode();
        return;
      }

      commitThreadPlacementAtScreenPoint(event.clientX, event.clientY);
    },
    [
      addBlockAtPosition,
      commitThreadPlacementAtScreenPoint,
      placementMode,
      reactFlow,
      resetPlacementMode,
    ]
  );

  const onNodesChangeWithThreadDetach = useCallback(
    (changes: NodeChange<FlowchartNode>[]) => {
      const removedIds = changes
        .filter(
          (change): change is NodeRemoveChange => change.type === "remove"
        )
        .map((change) => change.id);

      if (removedIds.length > 0) {
        const currentNodes = reactFlow.getNodes();

        for (const thread of threads) {
          const { attachedToNodeId } = thread.metadata;

          if (
            attachedToNodeId == null ||
            !removedIds.includes(attachedToNodeId)
          ) {
            continue;
          }

          const node = currentNodes.find(
            (node) => node.id === attachedToNodeId
          );

          if (!node) {
            continue;
          }

          const { x, y } = thread.metadata;
          const point = normalizedToFlowPoint(node, { x, y });

          editThreadMetadata({
            threadId: thread.id,
            metadata: {
              attachedToNodeId: undefined,
              x: point.x,
              y: point.y,
            },
          });
        }
      }
      onNodesChange(changes);
    },
    [editThreadMetadata, onNodesChange, reactFlow, threads]
  );

  const onReconnect = useCallback(
    (oldEdge: FlowchartEdge, newConnection: Connection) => {
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
    (_: MouseEvent | TouchEvent, edge: FlowchartEdge) => {
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
      className={clsx("relative w-full h-full", className)}
      data-placing={isPlacing ? "true" : "false"}
      {...props}
    >
      <ReactFlow
        className="flowchart"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWithThreadDetach}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handleCanvasClickForPlacement}
        onNodeClick={handleCanvasClickForPlacement}
        onPaneContextMenu={(event) => {
          if (!isPlacing) {
            return;
          }

          event.preventDefault();
          resetPlacementMode();
        }}
        nodeTypes={{ block: BlockNode }}
        edgeTypes={{ [FLOWCHART_EDGE_TYPE]: FlowchartLabelEdge }}
        defaultEdgeOptions={{
          type: FLOWCHART_EDGE_TYPE,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Step}
        panOnScroll
        panOnDrag={[1]}
        elementsSelectable={!isPlacing}
        selectionOnDrag={!isPlacing}
        selectionMode={SelectionMode.Partial}
        fitView
        edgesReconnectable
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
      >
        <FlowchartCanvasDnd
          mode={placementMode}
          onCancelPlacement={resetPlacementMode}
        >
          <Cursors components={{ Cursor: FlowCursor }} />
          <Controls />
          <MiniMap
            nodeComponent={MiniMapNode}
            nodeColor={(node: FlowchartNode) => getBlockColor(node.data.color)}
            nodeStrokeWidth={0}
          />
          <Panel position="bottom-center">
            <FlowToolbar
              mode={placementMode}
              onSelectShapeForPlacement={(shape) => {
                setPlacementMode({ kind: "placing-shape", shape });
              }}
              onAddComment={() => {
                setPlacementMode({ kind: "placing-comment" });
              }}
            />
          </Panel>
          <Panel position="top-right">
            <div className="flowchart-avatar-stack">
              <AvatarStack size={32} gap={3} />
            </div>
          </Panel>
          <Panel position="top-left">
            <form className="flowchart-agent-panel" action={formAction}>
              <input type="hidden" name="roomId" value={roomId} />
              <label
                className="flowchart-agent-label"
                htmlFor="flowchart-agent-prompt"
              >
                Flowchart AI
              </label>
              <textarea
                id="flowchart-agent-prompt"
                name="prompt"
                className="flowchart-agent-textarea nodrag"
                rows={3}
                placeholder="Create a flowchart about…"
                value={agentPrompt}
                disabled={isAgentPending}
                onChange={(event) => {
                  setAgentPrompt(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !isAgentPending &&
                    agentPrompt.trim() !== ""
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                className="flowchart-agent-submit"
                disabled={trimmedAgentPrompt === "" || isAgentPending}
              >
                {isAgentPending ? "Generating…" : "Generate"}
              </button>
            </form>
          </Panel>
          <Background />
        </FlowchartCanvasDnd>
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <div className="relative h-screen w-screen flex flex-col bg-[#f7f9fb]">
      <RoomProvider id={EXAMPLES.flowchart.roomId}>
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
