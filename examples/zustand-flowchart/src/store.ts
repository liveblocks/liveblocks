import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";
import { createClient } from "@liveblocks/client";
import type { EnsureJson } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import nodes from "./nodes";
import edges from "./edges";

declare global {
  interface Liveblocks {
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: Storage;
  }
}

/**
 * This file contains the Zustand store & Liveblocks middleware
 * https://liveblocks.io/docs/api-reference/liveblocks-zustand
 */

// Create a Liveblocks client with your API key
const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY as string,
  throttle: 16, // Updates every 16ms === 60fps animation
});

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
};

type Storage = EnsureJson<{
  nodes: FlowState["nodes"];
  edges: FlowState["edges"];
}>;

// Define your fully-typed Zustand store
const useStore = create<WithLiveblocks<FlowState>>()(
  liveblocks(
    (set, get) => ({
      // Initial values for nodes and edges
      nodes,
      edges,

      // Apply changes to React Flow when the flowchart is interacted with
      onNodesChange: (changes: NodeChange[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },
      onConnect: (connection: Connection) => {
        set({
          edges: addEdge(connection, get().edges),
        });
      },
    }),
    {
      // Add Liveblocks client
      client,

      // Define the store properties that should be shared in real-time
      storageMapping: {
        nodes: true,
        edges: true,
      },
    }
  )
);

export default useStore;
