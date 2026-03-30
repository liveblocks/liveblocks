import type { SyncConfig } from "@liveblocks/core";

export const DEFAULT_STORAGE_KEY = "flow";

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
} as const satisfies SyncConfig;

export const EDGE_BASE_CONFIG = {
  // Local-only (not synced)
  selected: false,

  // Atomic (synced as plain Json)
  markerStart: "atomic",
  markerEnd: "atomic",

  // Note: the `data` key is intentionally left out of this base config, as it
  // is expected to be provided by the end user
} as const satisfies SyncConfig;
