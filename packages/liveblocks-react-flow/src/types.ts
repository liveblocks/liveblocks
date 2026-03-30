import type {
  DistributiveOmit,
  LiveMap,
  LiveObject,
  LsonObject,
  SyncConfig,
  SyncMode,
} from "@liveblocks/core";
import type { BuiltInEdge, BuiltInNode, Edge, Node } from "@xyflow/react";

export type { SyncConfig, SyncMode };

// XXX The public types should reflect the runtime behaviors (deep-livefied, local-only, atomic, etc.)
// XXX The internal types can stay simpler (only focus on the root and not `data`), but should still ideally be derived from NODE_BASE_CONFIG and EDGE_BASE_CONFIG.

export type InternalLiveblocksNode = LiveObject<
  DistributiveOmit<Node, "data"> & { data: LsonObject } & LsonObject
>;

export type InternalLiveblocksEdge = LiveObject<
  DistributiveOmit<Edge, "data"> & { data?: LsonObject } & LsonObject
>;

export type InternalLiveblocksFlow = LiveObject<{
  nodes: LiveMap<string, InternalLiveblocksNode>;
  edges: LiveMap<string, InternalLiveblocksEdge>;
}>;

type InferNodeTypeLiterals<N> =
  N extends Node<any, infer T extends string>
    ? string extends T
      ? never
      : T
    : never;

type NodeTypeLiterals<N> =
  | (string & {}) // eslint-disable-line @typescript-eslint/ban-types
  | "*"
  | InferNodeTypeLiterals<N>;

type InferEdgeTypeLiterals<E> =
  E extends Edge<any, infer T extends string>
    ? string extends T
      ? never
      : T
    : never;

type EdgeTypeLiterals<E> =
  | (string & {}) // eslint-disable-line @typescript-eslint/ban-types
  | "*"
  | InferEdgeTypeLiterals<E>;

export type NodeSyncConfig<N extends Node> = {
  [key in NodeTypeLiterals<N>]?: SyncConfig;
};

export type EdgeSyncConfig<E extends Edge> = {
  [key in EdgeTypeLiterals<E>]?: SyncConfig;
};

/**
 * The Liveblocks Storage representation of a React Flow `Node`.
 */
export type LiveblocksNode<
  N extends Node = BuiltInNode,
  _S extends NodeSyncConfig<N> = NodeSyncConfig<N>,
> = LiveObject<DistributiveOmit<N, "data"> & { data: LsonObject } & LsonObject>;

/**
 * The Liveblocks Storage representation of a React Flow `Edge`.
 */
export type LiveblocksEdge<
  E extends Edge = BuiltInEdge,
  _S extends EdgeSyncConfig<E> = EdgeSyncConfig<E>,
> = LiveObject<
  DistributiveOmit<E, "data"> & { data?: LsonObject } & LsonObject
>;

/**
 * The Liveblocks Storage representation of a React Flow diagram made of nodes and edges.
 */
export type LiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
  NS extends NodeSyncConfig<N> = NodeSyncConfig<N>,
  ES extends EdgeSyncConfig<E> = EdgeSyncConfig<E>,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<N, NS>>;
  edges: LiveMap<string, LiveblocksEdge<E, ES>>;
}>;
