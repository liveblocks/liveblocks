"use client";

import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import { ControlButton, Controls, MiniMap, ReactFlow } from "@xyflow/react";

export function Flowchart() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow({
      suspense: true,
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
      fitView
    >
      <Cursors />
      <Controls orientation="horizontal" showInteractive={false}>
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
      <MiniMap />
    </ReactFlow>
  );
}
