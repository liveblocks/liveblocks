import type { Edge, Node } from "@xyflow/react";

export const DEFAULT_STORAGE_KEY = "flow";

export const NODE_LOCAL_KEYS: Set<string> = new Set([
  "selected",
  "dragging",
  "measured",
  "resizing",
] as const satisfies (keyof Node)[]);

export const NODE_ATOMIC_KEYS: Set<string> = new Set([
  "position",
  "sourcePosition",
  "targetPosition",
  "extent",
  "origin",
  "handles",
] as const satisfies (keyof Node)[]);

export const EDGE_LOCAL_KEYS: Set<string> = new Set([
  "selected",
] as const satisfies (keyof Edge)[]);

export const EDGE_ATOMIC_KEYS: Set<string> = new Set([
  "markerStart",
  "markerEnd",
] as const satisfies (keyof Edge)[]);
