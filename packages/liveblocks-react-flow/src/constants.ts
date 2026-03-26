import type { Edge } from "@xyflow/react";

export const DEFAULT_STORAGE_KEY = "flow";

// React Flow `Node` properties that are purely ephemeral and local to each client
// instead of being written to Liveblocks Storage.
export const NODE_LOCAL_KEYS = [
  "selected",
  "dragging",
  "measured",
  "resizing",
] as const satisfies (keyof Node)[number][];

// React Flow `Edge` properties that are purely ephemeral and local to each client
// instead of being written to Liveblocks Storage.
export const EDGE_LOCAL_KEYS = [
  "selected",
] as const satisfies (keyof Edge)[number][];
