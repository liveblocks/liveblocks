"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useLiveblocksFlow({
      initialNodes: [
        { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
        { id: "2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
      ],
      initialEdges: [{ id: "e1-2", source: "1", target: "2" }],
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
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider id="liveblocks:examples:next-react-flow-kitchen-sink">
      <ClientSideSuspense fallback={null}>
        <Flow />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
