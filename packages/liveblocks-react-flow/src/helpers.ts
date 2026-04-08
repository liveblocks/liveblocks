import type { JsonObject, SyncConfig, SyncMode } from "@liveblocks/core";
import { LiveObject } from "@liveblocks/core";
import type { Edge, Node } from "@xyflow/react";

import type { InternalLiveblocksEdge, InternalLiveblocksNode } from "./types";

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

/**
 * Merges a base config with per-type user data configs, returning a lookup
 * function that resolves the full SyncConfig for a given type string.
 */
export function buildFlowDataConfigCache(
  base: SyncConfig,
  data?: Record<string, SyncConfig | undefined>
): (type: string | undefined) => SyncConfig {
  if (!data) return () => base;

  const dataFallback = data["*"];
  const fallback = dataFallback ? { ...base, data: dataFallback } : base;

  // Pre-compute full sync configs for all explicitly declared types
  const cache = new Map<string | undefined, SyncConfig>();
  for (const type in data) {
    if (type === "*") continue;
    const specific = data[type];
    if (!specific) continue;
    const dataConfig: SyncConfig = { ...dataFallback, ...specific };
    cache.set(type, { ...base, data: dataConfig });
  }

  return (type) => cache.get(type) || fallback;
}

export function buildNodeConfigCache(
  nodeDataConfig?: Record<string, SyncConfig | undefined>
): (type: string | undefined) => SyncConfig {
  return buildFlowDataConfigCache(NODE_BASE_CONFIG, nodeDataConfig);
}

export function buildEdgeConfigCache(
  edgeDataConfig?: Record<string, SyncConfig | undefined>
): (type: string | undefined) => SyncConfig {
  return buildFlowDataConfigCache(EDGE_BASE_CONFIG, edgeDataConfig);
}

export function toLiveblocksInternalNode<N extends Node>(
  node: N,
  config: SyncConfig
): InternalLiveblocksNode {
  return LiveObject.from(
    node as unknown as JsonObject,
    config
  ) as InternalLiveblocksNode;
}

export function toLiveblocksInternalEdge<E extends Edge>(
  edge: E,
  config: SyncConfig
): InternalLiveblocksEdge {
  return LiveObject.from(
    edge as unknown as JsonObject,
    config
  ) as InternalLiveblocksEdge;
}
