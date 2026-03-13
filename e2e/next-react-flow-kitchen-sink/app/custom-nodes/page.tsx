"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";
import { useLiveblocksFlow } from "@liveblocks/react-flow/suspense";
import { Controls, Handle, MiniMap, Position, ReactFlow } from "@xyflow/react";
import { ChangeEvent, memo, useCallback, useMemo } from "react";

const DEFAULT_BACKGROUND_COLOR = "#c9f1dd";
const DEFAULT_SNAP_GRID: [number, number] = [20, 20];
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1.5 } as const;

const ColorSelectorNode = memo(
  ({
    data,
    isConnectable,
  }: {
    data: {
      color: string;
      onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    };
    isConnectable?: boolean;
  }) => (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <div>
        Custom Color Picker Node: <strong>{data.color}</strong>
      </div>
      <input
        className="nodrag"
        type="color"
        onChange={data.onChange}
        value={data.color}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </>
  )
);

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, updateNode } =
    useLiveblocksFlow<{ label?: string; color?: string }>({
      initial: {
        nodes: [
          {
            id: "1",
            type: "input",
            data: { label: "An input node" },
            position: { x: 0, y: 50 },
            sourcePosition: Position.Right,
          },
          {
            id: "2",
            type: "selectorNode",
            data: { color: DEFAULT_BACKGROUND_COLOR },
            position: { x: 300, y: 50 },
          },
          {
            id: "3",
            type: "output",
            data: { label: "Output A" },
            position: { x: 650, y: 25 },
            targetPosition: Position.Left,
          },
          {
            id: "4",
            type: "output",
            data: { label: "Output B" },
            position: { x: 650, y: 100 },
            targetPosition: Position.Left,
          },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2", animated: true },
          { id: "e2a-3", source: "2", target: "3", animated: true },
          { id: "e2b-4", source: "2", target: "4", animated: true },
        ],
      },
    });

  const handleColorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const color = event.target.value;

      updateNode("2", (node) => ({ ...node, data: { ...node.data, color } }));
    },
    [updateNode]
  );

  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((node) => {
        if (node.id !== "2") {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            onChange: handleColorChange,
          },
        };
      }),
    [nodes, handleColorChange]
  );

  const color =
    nodes.find((node) => node.id === "2")?.data?.color ??
    DEFAULT_BACKGROUND_COLOR;

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        style={{ background: color }}
        nodeTypes={{
          selectorNode: ColorSelectorNode,
        }}
        snapToGrid={true}
        snapGrid={DEFAULT_SNAP_GRID}
        defaultViewport={DEFAULT_VIEWPORT}
        fitView
      >
        <MiniMap
          nodeStrokeColor={(node) => {
            if (node.type === "input") return "#0041d0";
            if (node.type === "selectorNode") return color;
            if (node.type === "output") return "#ff0072";
            return "#fff";
          }}
          nodeColor={(node) => {
            if (node.type === "selectorNode") return color;
            return "#fff";
          }}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider id="liveblocks:examples:next-react-flow-kitchen-sink:custom-nodes">
      <ClientSideSuspense fallback={null}>
        <Flow />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
