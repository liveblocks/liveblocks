import type { JsonObject, SyncConfig } from "@liveblocks/core";
import { deepLiveifyObject } from "@liveblocks/core";
import type { Edge, Node } from "@xyflow/react";

import type { LiveblocksEdge, LiveblocksNode } from "./types";

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
  config: SyncConfig
): LiveblocksNode<N> {
  return deepLiveifyObject(
    node as unknown as JsonObject,
    config
  ) as LiveblocksNode<N>;
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
  config: SyncConfig
): LiveblocksEdge<E> {
  return deepLiveifyObject(
    edge as unknown as JsonObject,
    config
  ) as LiveblocksEdge<E>;
}
