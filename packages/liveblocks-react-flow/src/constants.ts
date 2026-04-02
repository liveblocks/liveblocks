import type { SyncMode } from "@liveblocks/core";
import type { Edge, Node } from "@xyflow/react";

export const DEFAULT_STORAGE_KEY = "flow";

// React Flow specific versions of `SyncConfig` that only allow keys that are actually exposed by React Flow.
type NodeSyncConfig = { [K in keyof Node]?: SyncMode };
type EdgeSyncConfig = { [K in keyof Edge]?: SyncMode };

export const NODE_BASE_CONFIG = {
  // Local-only (not synced)
  selected: false,
  dragging: false,
  measured: false,
  resizing: false,

  // Atomic (synced as plain Json)
  position: "atomic",
  sourcePosition: "atomic",
  targetPosition: "atomic",
  extent: "atomic",
  origin: "atomic",
  handles: "atomic",

  // Note: the `data` key is intentionally left out of this base config, as it
  // is expected to be provided by the end user
} as const satisfies NodeSyncConfig;

export const EDGE_BASE_CONFIG = {
  // Local-only (not synced)
  selected: false,

  // Atomic (synced as plain Json)
  markerStart: "atomic",
  markerEnd: "atomic",
  label: "atomic",
  labelBgPadding: "atomic",

  // Note: the `data` key is intentionally left out of this base config, as it
  // is expected to be provided by the end user
} as const satisfies EdgeSyncConfig;
