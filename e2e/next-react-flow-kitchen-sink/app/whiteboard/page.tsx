"use client";

import {
  ClientSideSuspense,
  RoomProvider,
  type JsonObject,
} from "@liveblocks/react";
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
  type Connection,
  type Edge,
  type EdgeProps,
  type MiniMapNodeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnResize,
} from "@xyflow/react";
import {
  ComponentProps,
  CSSProperties,
  DragEvent,
  Fragment,
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { EXAMPLES } from "../examples";
import "./whiteboard.css";
import clsx from "clsx";
import { AvatarStack } from "@liveblocks/react-ui";

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

const DEFAULT_BLOCK_SIZE = 100;
const DEFAULT_BLOCK_SHAPE: BlockShape = "rectangle";
const DEFAULT_BLOCK_COLOR: BlockColor = "gray";

type BlockShape = (typeof BLOCK_SHAPES)[number];
type BlockColor = keyof typeof BLOCK_COLORS;

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

function ShapeIcon({ shape }: { shape: BlockShape }) {
  return <span className="whiteboard-shape-icon" data-shape={shape} />;
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
        style: { ...node.style, width, height },
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
        style={
          {
            "--whiteboard-block-color": getBlockColor(data.color),
          } as CSSProperties
        }
        data-shape={getBlockShape(data.shape)}
      >
        <textarea
          className="whiteboard-block-label nodrag"
          value={labelDraft}
          placeholder="Type something..."
          rows={1}
          onChange={(event) => setLabelDraft(event.target.value)}
          onBlur={(event) => commitLabel(event.target.value)}
          onKeyDown={(event) => {
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
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
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

    useEffect(() => {
      if (isEditing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isEditing]);

    const commitLabel = useCallback(
      (text: string) => {
        const nextLabel = text.trim();

        setLabelDraft(nextLabel);
        setIsEditing(false);
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
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      },
      []
    );

    return (
      <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        <EdgeLabelRenderer>
          <div
            className="whiteboard-edge-label-shell nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {selected && labelDraft.trim() === "" && !isEditing ? (
              <button
                type="button"
                className="whiteboard-edge-label-button"
                aria-label="Add edge label"
                onClick={() => setIsEditing(true)}
              >
                <span className="whiteboard-edge-label-button-icon">T</span>
              </button>
            ) : null}
            <input
              ref={inputRef}
              className="whiteboard-edge-label"
              data-empty={labelDraft.trim() === "" ? "" : undefined}
              size={Math.max(labelDraft.trim().length, 4)}
              value={labelDraft}
              placeholder="Add label"
              onChange={(event) => setLabelDraft(event.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={(event) => commitLabel(event.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
            />
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

function FlowToolbar({
  onAddShape,
}: {
  onAddShape: (shape: BlockShape) => void;
}) {
  const suppressClickAfterDrop = useRef(false);

  const handleDragStart = useCallback((event: DragEvent, shape: BlockShape) => {
    event.dataTransfer.setData("application/whiteboard-shape", shape);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback((event: DragEvent) => {
    if (event.dataTransfer.dropEffect !== "none") {
      suppressClickAfterDrop.current = true;

      window.setTimeout(() => {
        suppressClickAfterDrop.current = false;
      }, 0);
    }
  }, []);

  const handleShapeItemClick = useCallback(
    (shape: BlockShape) => {
      if (suppressClickAfterDrop.current) {
        return;
      }
      onAddShape(shape);
    },
    [onAddShape]
  );

  return (
    <div className="whiteboard-toolbar">
      {BLOCK_SHAPES.map((shape) => {
        const label = capitalize(shape);

        return (
          <div
            key={shape}
            className="whiteboard-toolbar-item"
            draggable
            onDragStart={(dragEvent) => handleDragStart(dragEvent, shape)}
            onDragEnd={handleDragEnd}
            onClick={() => handleShapeItemClick(shape)}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                keyboardEvent.preventDefault();
                onAddShape(shape);
              }
            }}
            role="button"
            tabIndex={0}
            title={`Add ${label} (click) or drag onto the canvas`}
          >
            <ShapeIcon shape={shape} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
function Flow({ className, ...props }: ComponentProps<"div">) {
  const didReconnectRef = useRef(false);
  const { screenToFlowPosition } = useReactFlow();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow<WhiteboardNode, WhiteboardEdge>({
      initial: { nodes: INITIAL_NODES, edges: INITIAL_EDGES },
    });

  const addBlockAtPosition = useCallback(
    (shape: BlockShape, position: { x: number; y: number }) => {
      const newNode: WhiteboardNode = {
        id: `block-${nanoid()}`,
        type: "block",
        position,
        data: {
          label: "",
          shape,
          color: DEFAULT_BLOCK_COLOR,
        },
        style: { width: DEFAULT_BLOCK_SIZE, height: DEFAULT_BLOCK_SIZE },
        selected: true,
      };

      const deselectChanges: NodeChange<WhiteboardNode>[] = (nodes ?? [])
        .filter((node) => node.selected)
        .map((node) => ({
          type: "select",
          id: node.id,
          selected: false,
        }));

      onNodesChange([...deselectChanges, { type: "add", item: newNode }]);
    },
    [nodes, onNodesChange]
  );

  const onAddShapeAtCenter = useCallback(
    (shape: BlockShape) => {
      addBlockAtPosition(
        shape,
        screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
      );
    },
    [addBlockAtPosition, screenToFlowPosition]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const shapePayload = event.dataTransfer.getData(
        "application/whiteboard-shape"
      );

      if (!isBlockShape(shapePayload)) {
        return;
      }

      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const halfWidth = DEFAULT_BLOCK_SIZE / 2;
      const halfHeight = DEFAULT_BLOCK_SIZE / 2;

      addBlockAtPosition(shapePayload, {
        x: flowPosition.x - halfWidth,
        y: flowPosition.y - halfHeight,
      });
    },
    [addBlockAtPosition, screenToFlowPosition]
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
    <div className={clsx("relative w-full h-full", className)} {...props}>
      <ReactFlow
        className="whiteboard"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        fitView
        edgesReconnectable
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
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
          <FlowToolbar onAddShape={onAddShapeAtCenter} />
        </Panel>
        <Panel position="top-right">
          <div className="whiteboard-avatar-stack">
            <AvatarStack size={26} gap={3} />
          </div>
        </Panel>
        <Background />
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
