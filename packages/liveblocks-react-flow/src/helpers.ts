import type { JsonObject, SyncConfig } from "@liveblocks/core";
import { deepLiveifyObject } from "@liveblocks/core";
import type { Edge, Node } from "@xyflow/react";

import { EDGE_BASE_CONFIG, NODE_BASE_CONFIG } from "./constants";
import type {
  InternalLiveblocksEdge,
  InternalLiveblocksNode,
  LiveblocksEdge,
  LiveblocksNode,
} from "./types";

export function toLiveblocksInternalNode<N extends Node>(
  node: N,
  config: SyncConfig
): InternalLiveblocksNode {
  return deepLiveifyObject(node as unknown as JsonObject, config) as InternalLiveblocksNode;
}

export function toLiveblocksInternalEdge<E extends Edge>(
  edge: E,
  config: SyncConfig
): InternalLiveblocksEdge {
  return deepLiveifyObject(edge as unknown as JsonObject, config) as InternalLiveblocksEdge;
}

/**
 * @experimental
 *
 * Converts a React Flow `Node` into a Liveblocks Storage version.
 * Keys marked `false` in config are set as local-only (not synced).
 * Keys marked `"atomic"` are stored as plain Json (no deep wrapping).
 * All other keys are deep-liveified (objects→LiveObject, arrays→LiveList).
 */
export function toLiveblocksNode<N extends Node>(
  node: N,
  config?: SyncConfig
): LiveblocksNode<N> {
  return toLiveblocksInternalNode(node, {
    ...NODE_BASE_CONFIG,
    data: config,
  }) as unknown as LiveblocksNode<N>;
}

/**
 * @experimental
 *
 * Converts a React Flow `Edge` into a Liveblocks Storage version.
 * Keys marked `false` in config are set as local-only (not synced).
 * Keys marked `"atomic"` are stored as plain Json (no deep wrapping).
 * All other keys are deep-liveified (objects→LiveObject, arrays→LiveList).
 */
export function toLiveblocksEdge<E extends Edge>(
  edge: E,
  config?: SyncConfig
): LiveblocksEdge<E> {
  return toLiveblocksInternalEdge(edge, {
    ...EDGE_BASE_CONFIG,
    data: config,
  }) as unknown as LiveblocksEdge<E>;
}
