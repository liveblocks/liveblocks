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
import { createClient, Json } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import nodes from "./nodes";
import edges from "./edges";

// XXX Remove when upgrading to 2.0.0-alpha2
type EnsureJson<T> =
  // Retain all valid `JSON` fields
  T extends Json
    ? T
    : // Retain all valid arrays
      T extends Array<infer I>
      ? EnsureJson<I>[]
      : // Retain `unknown` fields, but just treat them as if they're Json | undefined
        [unknown] extends [T]
        ? Json | undefined
        : // Remove functions
          T extends (...args: any[]) => any
          ? never
          : // Resolve all other values explicitly
            {
              [K in keyof T as EnsureJson<T[K]> extends never
                ? never
                : K]: EnsureJson<T[K]>;
            };

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

type Storage = {
  nodes: FlowState["nodes"];
  edges: FlowState["edges"];
};

// Define your fully-typed Zustand store
const useStore = create<WithLiveblocks<FlowState, {}, EnsureJson<Storage>>>()(
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
