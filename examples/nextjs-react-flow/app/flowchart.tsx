"use client";

import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  ControlButton,
  Controls,
  Handle,
  MiniMap,
  NodeResizer,
  NodeToolbar,
  Position,
  ReactFlow,
  useReactFlow,
  type BuiltInNode,
  type Node,
  type NodeProps,
  type OnResize,
} from "@xyflow/react";
import { memo, useCallback } from "react";

const EMOJIS = ["🚀", "🔥", "✨"] as const;

type EmojiNode = Node<{ emoji: string }, "emoji">;
type ResizeNode = Node<Record<string, never>, "resize">;
type FlowchartNode = BuiltInNode | EmojiNode | ResizeNode;

const EmojiNode = memo(({ id, data }: NodeProps<EmojiNode>) => {
  const { emoji = EMOJIS[0] } = data;
  const { updateNode } = useReactFlow();

  const handleEmojiSelect = useCallback(
    (next: string) => {
      updateNode(id, (node) => ({
        ...node,
        data: { ...node.data, emoji: next },
      }));
    },
    [id, updateNode]
  );

  return (
    <>
      <NodeToolbar
        isVisible
        className="flex gap-1 rounded-full bg-neutral-900 p-1 shadow-md"
      >
        {EMOJIS.map((e) => {
          const isActive = e === emoji;
          return (
            <button
              key={e}
              type="button"
              onClick={() => handleEmojiSelect(e)}
              aria-label={`Select emoji ${e}`}
              aria-pressed={isActive}
              className="cursor-pointer rounded-full size-8 hover:bg-neutral-700 aria-pressed:bg-neutral-700"
            >
              {e}
            </button>
          );
        })}
      </NodeToolbar>
      <div className="w-full h-full flex items-center justify-center text-2xl">
        {emoji}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
});

const ResizeNode = memo(
  ({
    id,
    width,
    height,
    positionAbsoluteX,
    positionAbsoluteY,
  }: NodeProps<ResizeNode>) => {
    const { updateNode } = useReactFlow();

    const handleResize = useCallback<OnResize>(
      (_, { width, height }) => {
        updateNode(id, (node) => ({
          ...node,
          style: { ...node.style, width, height },
        }));
      },
      [id, updateNode]
    );

    return (
      <>
        <NodeResizer minWidth={1} minHeight={1} onResize={handleResize} />
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
        <div className="w-full h-full flex flex-col gap-4 items-center justify-center overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[0.75em] opacity-60">Position</span>
            <span className="tabular-nums">
              {Math.round(positionAbsoluteX)} × {Math.round(positionAbsoluteY)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.75em] opacity-60">Size</span>
            <span className="tabular-nums">
              {width} × {height}
            </span>
          </div>
        </div>
      </>
    );
  }
);

const nodeTypes = {
  emoji: EmojiNode,
  resize: ResizeNode,
};

const initialNodes: FlowchartNode[] = [
  {
    id: "multiplayer",
    type: "input",
    data: { label: "Multiplayer" },
    position: { x: 250, y: 25 },
  },
  {
    id: "flowcharts",
    data: { label: "flowcharts" },
    position: { x: 100, y: 125 },
  },
  {
    id: "react-flow",
    data: { label: "React Flow" },
    position: { x: 250, y: 225 },
    style: { borderColor: "#FF0072" },
  },
  {
    id: "liveblocks",
    type: "output",
    data: { label: "Liveblocks" },
    position: { x: 100, y: 325 },
    style: { borderColor: "#944DFA" },
  },
  {
    id: "emoji",
    type: "emoji",
    data: { emoji: "🚀" },
    position: { x: 475, y: 55 },
    width: 80,
    height: 80,
  },
  {
    id: "resize",
    type: "resize",
    data: {},
    position: { x: 350, y: 325 },
    width: 125,
    height: 125,
  },
];

const initialEdges = [
  {
    id: "e-multiplayer-to-flowcharts",
    source: "multiplayer",
    target: "flowcharts",
    type: "smoothstep" as const,
  },
  {
    id: "e-flowcharts-to-react-flow",
    source: "flowcharts",
    target: "react-flow",
    label: "with",
  },
  {
    id: "e-react-flow-to-liveblocks",
    source: "react-flow",
    target: "liveblocks",
    label: "and",
    animated: true,
  },
  {
    id: "e-multiplayer-to-emoji",
    source: "multiplayer",
    target: "emoji",
    type: "smoothstep" as const,
  },
  {
    id: "e-emoji-to-resize",
    source: "emoji",
    target: "resize",
    type: "smoothstep" as const,
    animated: true,
  },
];

export function Flowchart() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<FlowchartNode>({
      suspense: true,
      nodes: { initial: initialNodes },
      edges: { initial: initialEdges },
    });
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      nodeTypes={nodeTypes}
      fitView
    >
      <Cursors />
      <Controls>
        <ControlButton onClick={undo} disabled={!canUndo}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
            <path d="m11.983 5.626-4.641 4.643H21.36a9.358 9.358 0 0 1 0 18.714h-5.356V25.27h5.356a5.642 5.642 0 1 0 0-11.286H7.342l4.641 4.643-2.626 2.626-7.813-7.812a1.86 1.86 0 0 1 0-2.627L9.357 3z" />
          </svg>
        </ControlButton>
        <ControlButton onClick={redo} disabled={!canRedo}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
            <path d="m19.735 5.626 4.642 4.643H10.358a9.358 9.358 0 0 0 0 18.714h5.357V25.27h-5.357a5.642 5.642 0 1 1 0-11.286h14.019l-4.642 4.643 2.626 2.626 7.814-7.812a1.86 1.86 0 0 0 0-2.627L22.36 3z" />
          </svg>
        </ControlButton>
      </Controls>
      <MiniMap zoomable pannable />
    </ReactFlow>
  );
}
