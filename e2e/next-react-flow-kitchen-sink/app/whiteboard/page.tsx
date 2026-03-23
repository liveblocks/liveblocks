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
  ConnectionLineType,
  ConnectionMode,
  Controls,
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
  useNodes,
  useReactFlow,
  type Connection,
  type Edge,
  type MiniMapNodeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnResize,
} from "@xyflow/react";
import {
  CSSProperties,
  DragEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { EXAMPLES } from "../examples";
import "./whiteboard.css";

const BLOCK_SHAPES = ["rectangle", "rounded", "circle"] as const;
const BLOCK_COLORS = {
  gray: "#678",
  blue: "#09f",
  cyan: "#0cd",
  green: "#3c5",
  yellow: "#fc0",
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

type WhiteboardNode = Node<BlockNodeData>;
type WhiteboardEdge = Edge<JsonObject>;

const INITIAL_NODES: WhiteboardNode[] = [
  {
    id: "block-1",
    type: "block",
    position: { x: 80, y: 130 },
    data: { label: "Start", shape: "rounded", color: "blue" },
    style: { width: DEFAULT_BLOCK_SIZE, height: DEFAULT_BLOCK_SIZE },
  },
  {
    id: "block-2",
    type: "block",
    position: { x: 340, y: 80 },
    data: { label: "Idea", shape: "circle", color: "yellow" },
    style: { width: DEFAULT_BLOCK_SIZE, height: DEFAULT_BLOCK_SIZE },
  },
  {
    id: "block-3",
    type: "block",
    position: { x: 580, y: 130 },
    data: { label: "End", shape: "rectangle", color: "pink" },
    style: { width: DEFAULT_BLOCK_SIZE, height: DEFAULT_BLOCK_SIZE },
  },
];

const INITIAL_EDGES: WhiteboardEdge[] = [
  {
    id: "e-1-2",
    source: "block-1",
    target: "block-2",
    type: "smoothstep",
  },
  {
    id: "e-2-3",
    source: "block-2",
    target: "block-3",
    type: "smoothstep",
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
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const labelElement = textRef.current;

    if (labelElement && document.activeElement !== labelElement) {
      labelElement.textContent = data.label;
      labelElement.dataset.empty = data.label === "" ? "true" : "";
    }
  }, [data.label]);

  const handleBlur = useCallback(() => {
    const text = textRef.current?.textContent?.trim() ?? "";

    if (textRef.current) {
      textRef.current.textContent = text;
      textRef.current.dataset.empty = text === "" ? "true" : "";
    }

    updateNode(id, (node) => ({
      ...node,
      data: { ...node.data, label: text },
    }));
  }, [id, updateNode]);

  const handleInput = useCallback(() => {
    const labelElement = textRef.current;

    if (labelElement) {
      labelElement.dataset.empty =
        (labelElement.textContent?.trim() ?? "") === "" ? "true" : "";
    }
  }, []);

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
        <div
          ref={textRef}
          className="whiteboard-block-label nodrag"
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onInput={handleInput}
        />
      </div>

      {(
        [
          [Position.Top, "top"],
          [Position.Right, "right"],
          [Position.Bottom, "bottom"],
          [Position.Left, "left"],
        ] as const
      ).map(([position, side]) => (
        <Handle
          key={side}
          type="source"
          position={position}
          id={`src-${side}`}
          className="whiteboard-handle"
        />
      ))}

      <NodeResizer
        minWidth={50}
        minHeight={50}
        isVisible={selected}
        onResize={handleResize}
      />
    </>
  );
});

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
function Flow() {
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
    <div className="h-screen w-screen">
      <ReactFlow
        className="whiteboard"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={{ block: BlockNode }}
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
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
        <Background />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider id={EXAMPLES.whiteboard.roomId}>
      <ReactFlowProvider>
        <ClientSideSuspense fallback={null}>
          <Flow />
        </ClientSideSuspense>
      </ReactFlowProvider>
    </RoomProvider>
  );
}
