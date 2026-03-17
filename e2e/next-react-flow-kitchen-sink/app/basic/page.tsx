"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow/suspense";
import { Controls, MiniMap, ReactFlow } from "@xyflow/react";

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow({
      initial: {
        nodes: [
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
        edges: [
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
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider id="liveblocks:examples:next-react-flow-kitchen-sink:basic">
      <ClientSideSuspense fallback={null}>
        <Flow />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
