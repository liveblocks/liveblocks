import type {
  DistributiveOmit,
  LiveMap,
  LiveObject,
  LsonObject,
} from "@liveblocks/core";
import type { BuiltInEdge, BuiltInNode, Edge, Node } from "@xyflow/react";

import type { EDGE_LOCAL_KEYS, NODE_LOCAL_KEYS } from "./constants";

/**
 * The Liveblocks Storage representation of a React Flow `Node`.
 *
 * It doesn't include local-only properties.
 * The entire node and its `data` property are both stored as `LiveObject`s.
 */
export type LiveblocksNode<N extends Node = BuiltInNode> = LiveObject<
  DistributiveOmit<N, (typeof NODE_LOCAL_KEYS)[number] | "data"> & {
    data: LiveObject<N["data"] & LsonObject>;
  } & LsonObject
>;

/**
 * The Liveblocks Storage representation of a React Flow `Edge`.
 *
 * It doesn't include local-only properties.
 * The entire edge and its `data` property are both stored as `LiveObject`s.
 */
export type LiveblocksEdge<E extends Edge = BuiltInEdge> = LiveObject<
  DistributiveOmit<E, (typeof EDGE_LOCAL_KEYS)[number] | "data"> & {
    data?: LiveObject<NonNullable<E["data"]> & LsonObject>;
  } & LsonObject
>;

/**
 * The Liveblocks Storage representation of a React Flow diagram made of nodes and edges.
 *
 * Nodes and edges are stored as `LiveMap`s keyed by their IDs, enabling
 * fine-grained conflict-free updates from multiple clients simultaneously.
 */
export type LiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<N>>;
  edges: LiveMap<string, LiveblocksEdge<E>>;
}>;

export type LocalNodes = Partial<
  Record<(typeof NODE_LOCAL_KEYS)[number], unknown>
>;
export type LocalEdges = Partial<
  Record<(typeof EDGE_LOCAL_KEYS)[number], unknown>
>;
