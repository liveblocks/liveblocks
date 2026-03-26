"use client";

import {
  ClientSideSuspense,
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow/suspense";
import { Panel, ReactFlow } from "@xyflow/react";
import { EXAMPLES } from "../examples";

function UndoRedoButtons() {
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <Panel position="top-left">
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={undo}
          disabled={!canUndo}
          style={{
            padding: "8px 16px",
            fontSize: 16,
            cursor: canUndo ? "pointer" : "default",
            opacity: canUndo ? 1 : 0.5,
          }}
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          style={{
            padding: "8px 16px",
            fontSize: 16,
            cursor: canRedo ? "pointer" : "default",
            opacity: canRedo ? 1 : 0.5,
          }}
        >
          Redo
        </button>
      </div>
    </Panel>
  );
}

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow({
      nodes: {
        initial: [
          {
            id: "1",
            type: "input",
            data: { label: "Multiplayer" },
            position: { x: 250, y: 25 },
          },
          {
            id: "2",
            data: { label: "flowcharts" },
            position: { x: 100, y: 125 },
          },
          {
            id: "3",
            data: { label: "React Flow" },
            position: { x: 250, y: 225 },
            style: { borderColor: "#FF0072" },
          },
          {
            id: "4",
            type: "output",
            data: { label: "Liveblocks" },
            position: { x: 100, y: 325 },
            style: { borderColor: "#944DFA" },
          },
        ],
      },
      edges: {
        initial: [
          { id: "e1-2", source: "1", target: "2", type: "smoothstep" },
          { id: "e2-3", source: "2", target: "3", label: "with" },
          {
            id: "e3-4",
            source: "3",
            target: "4",
            label: "and",
            animated: true,
          },
        ],
      },
    });

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Cursors />
        <UndoRedoButtons />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider id={EXAMPLES["basic-undo-redo"].roomId}>
      <ClientSideSuspense fallback={null}>
        <Flow />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
