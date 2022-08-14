import create from "zustand";
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
} from "react-flow-renderer";
import { createClient, EnsureJson } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY as string,
  throttle: 80,
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

const useStore = create(
  middleware<FlowState, {}, EnsureJson<Storage>>(
    (set, get) => ({
      nodes: [],
      edges: [],
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
      client,
      storageMapping: {
        nodes: true,
        edges: true,
      },
    }
  )
);

export default useStore;
