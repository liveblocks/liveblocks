"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import { memo, useCallback } from "react";

import { EXAMPLES } from "../examples";

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

// prettier-ignore
const FILL_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#fb7185", "#818cf8", "#34d399"
];

// prettier-ignore
const BG_COLORS = [
  "#ffffff", "#fefce8", "#fef9c3", "#fef3c7", "#ffedd5",
  "#fee2e2", "#fce7f3", "#fae8ff", "#f3e8ff", "#ede9fe",
  "#e0e7ff", "#dbeafe", "#e0f2fe", "#ccfbf1", "#d1fae5",
  "#dcfce7", "#ecfccb", "#f1f5f9", "#f5f5f4", "#fafaf9",
];

function randomFrom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Circle = { type: "circle"; radius: number; fill: string };
type Rect = { type: "rect"; width: number; height: number; fill: string };
type Shape = Circle | Rect;

type NodeData = {
  shape: Shape;
  bg: string;
};

type ShapeNode = Node<NodeData, "shape">;

// ---------------------------------------------------------------------------
// Shape preview
// ---------------------------------------------------------------------------

function ShapePreview({
  shape,
  onClickFill,
}: {
  shape: Shape;
  onClickFill: () => void;
}) {
  if (shape.type === "circle") {
    const size = shape.radius * 2;
    return (
      <div
        onClick={onClickFill}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: shape.fill,
          cursor: "pointer",
        }}
      />
    );
  }

  return (
    <div
      onClick={onClickFill}
      style={{
        width: shape.width,
        height: shape.height,
        borderRadius: 4,
        background: shape.fill,
        cursor: "pointer",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

function Slider({
  label,
  value,
  onChange,
  max = 80,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
    >
      <span style={{ width: 50, color: "#64748b" }}>{label}</span>
      <input
        className="nodrag"
        type="range"
        min={4}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ width: 20, textAlign: "right", fontSize: 11 }}>
        {value}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Shape node component
// ---------------------------------------------------------------------------

const ShapeNodeView = memo(({ id, data }: NodeProps<ShapeNode>) => {
  const { updateNode } = useReactFlow();

  const cycleShape = useCallback(() => {
    updateNode(id, (node) => ({
      ...node,
      data: {
        ...node.data,
        shape:
          node.data.shape.type === "circle"
            ? {
                type: "rect" as const,
                width: 60,
                height: 40,
                fill: node.data.shape.fill,
              }
            : {
                type: "circle" as const,
                radius: 30,
                fill: node.data.shape.fill,
              },
      },
    }));
  }, [id, updateNode]);

  const updateShapeProp = useCallback(
    (prop: string, value: number | string) => {
      updateNode(id, (node) => ({
        ...node,
        data: {
          ...node.data,
          shape: { ...node.data.shape, [prop]: value },
        },
      }));
    },
    [id, updateNode]
  );

  const randomizeBg = useCallback(() => {
    updateNode(id, (node) => ({
      ...node,
      data: { ...node.data, bg: randomFrom(BG_COLORS) },
    }));
  }, [id, updateNode]);

  const randomizeFill = useCallback(() => {
    updateShapeProp("fill", randomFrom(FILL_COLORS));
  }, [updateShapeProp]);

  return (
    <div
      className="nodrag"
      onClick={randomizeBg}
      style={{
        background: data.bg,
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 12,
        width: 240,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} />

      {/* Shape preview — click shape to randomize fill */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          randomizeFill();
        }}
        style={{
          display: "flex",
          justifyContent: "center",
          minHeight: 80,
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <ShapePreview shape={data.shape} onClickFill={() => {}} />
      </div>

      {/* Shape type tabs */}
      <div
        className="nodrag"
        style={{ display: "flex", gap: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {(["circle", "rect"] as const).map((type) => (
          <button
            key={type}
            onClick={() => {
              if (data.shape.type !== type) cycleShape();
            }}
            style={{
              flex: 1,
              padding: "4px 0",
              fontSize: 11,
              cursor: "pointer",
              border: "1px solid #e2e8f0",
              background: data.shape.type === type ? "#f1f5f9" : "white",
              fontWeight: data.shape.type === type ? 600 : 400,
              color: data.shape.type === type ? "#334155" : "#94a3b8",
              borderRadius: type === "circle" ? "4px 0 0 4px" : "0 4px 4px 0",
              borderLeft: type === "rect" ? "none" : undefined,
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Dimension sliders */}
      <div onClick={(e) => e.stopPropagation()}>
        {data.shape.type === "circle" ? (
          <Slider
            label="Radius"
            value={(data.shape as Circle).radius}
            onChange={(v) => updateShapeProp("radius", v)}
          />
        ) : (
          <>
            <Slider
              label="Width"
              value={(data.shape as Rect).width}
              onChange={(v) => updateShapeProp("width", v)}
            />
            <Slider
              label="Height"
              value={(data.shape as Rect).height}
              onChange={(v) => updateShapeProp("height", v)}
            />
          </>
        )}
      </div>

      {/* Raw data */}
      <pre
        style={{
          margin: 0,
          padding: 6,
          background: "#f1f5f9",
          borderRadius: 4,
          fontSize: 9,
          lineHeight: 1.4,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          color: "#1e293b",
          textAlign: "left",
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Initial data
// ---------------------------------------------------------------------------

const INITIAL_NODES: ShapeNode[] = [
  {
    id: "a",
    type: "shape",
    position: { x: 0, y: 0 },
    data: {
      shape: { type: "circle", radius: 30, fill: "#818cf8" },
      bg: "#ffffff",
    },
  },
  {
    id: "b",
    type: "shape",
    position: { x: 350, y: 0 },
    data: {
      shape: { type: "rect", width: 60, height: 40, fill: "#34d399" },
      bg: "#ffffff",
    },
  },
];

const INITIAL_EDGES = [{ id: "a-b", source: "a", target: "b" }];

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<ShapeNode>({
      suspense: true,
      nodes: { initial: INITIAL_NODES },
      edges: { initial: INITIAL_EDGES },
    });

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        nodeTypes={{ shape: ShapeNodeView }}
        fitView
      >
        <Cursors />
        <Background />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider id={EXAMPLES["deep-conflict-resolution"].roomId}>
      <ClientSideSuspense fallback={null}>
        <Flow />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
