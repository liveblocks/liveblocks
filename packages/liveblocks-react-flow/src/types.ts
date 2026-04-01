import type {
  JsonScalar,
  LiveList,
  LiveMap,
  LiveObject,
  Lson,
  LsonObject,
  SyncConfig,
  SyncMode,
} from "@liveblocks/core";
import type { BuiltInEdge, BuiltInNode, Edge, Node } from "@xyflow/react";

import type { EDGE_BASE_CONFIG, NODE_BASE_CONFIG } from "./constants";

export type { SyncConfig, SyncMode };

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

type ToLsonProperty<V, S extends SyncMode> = undefined extends V
  ? ToLson<Exclude<V, undefined>, S> | undefined
  : ToLson<V, S>;

type ResolveSyncMode<S extends SyncMode, K> = S extends SyncConfig
  ? K extends keyof S
    ? S[K] extends SyncMode
      ? S[K]
      : true
    : true
  : S;

// prettier-ignore
type ToLson<T, S extends SyncMode = true> = 
  [S] extends [false] ? T | undefined :
  [S] extends ["atomic"] ? T :
  T extends JsonScalar ? T :
  // eslint-disable-next-line @typescript-eslint/ban-types
  T extends Date | RegExp | Function | Promise<any> | WeakMap<any, any> | WeakSet<any> | Map<any, any> | Set<any> ? never :
  T extends ReadonlyArray<infer E> ? ToLiveList<E, S> :
  T extends object ? ToLiveObject<T, S> :
  never;

type ToLiveList<T, S extends SyncMode = true> = LiveList<ToLson<T, S> & Lson>;

// prettier-ignore
type ToLiveObject<T extends object, S extends SyncMode = true> =
  { [K in keyof T]: ToLsonProperty<T[K], ResolveSyncMode<S, K>> }
  & LsonObject extends infer O extends LsonObject ? LiveObject<O> : never;

// prettier-ignore
type ToLiveElement<S extends SyncConfig, B extends Node | Edge, T extends B, D> =
  {
    [K in keyof B]:
      K extends keyof S ? T[K & keyof T] :
      K extends "data" ? D :
      ToLson<B[K]>;
  }
  & LsonObject extends infer O extends LsonObject ? LiveObject<O> : never;

export type InternalLiveblocksNode = ToLiveElement<
  typeof NODE_BASE_CONFIG,
  Node,
  Node,
  LiveObject<LsonObject>
>;

export type InternalLiveblocksEdge = ToLiveElement<
  typeof EDGE_BASE_CONFIG,
  Edge,
  Edge,
  LiveObject<LsonObject>
>;

export type InternalLiveblocksFlow = LiveObject<{
  nodes: LiveMap<string, InternalLiveblocksNode>;
  edges: LiveMap<string, InternalLiveblocksEdge>;
}>;

/**
 * The Liveblocks Storage representation of a React Flow `Node`.
 */
export type LiveblocksNode<
  N extends Node = BuiltInNode,
  S extends SyncConfig = SyncConfig,
> = ToLiveElement<typeof NODE_BASE_CONFIG, Node, N, ToLson<N["data"], S>>;

/**
 * The Liveblocks Storage representation of a React Flow `Edge`.
 */
export type LiveblocksEdge<
  E extends Edge = BuiltInEdge,
  S extends SyncConfig = SyncConfig,
> = ToLiveElement<typeof EDGE_BASE_CONFIG, Edge, E, ToLson<E["data"], S>>;

/**
 * The Liveblocks Storage representation of a React Flow diagram made of nodes and edges.
 */
export type LiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
  NS extends SyncConfig = SyncConfig,
  ES extends SyncConfig = SyncConfig,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<N, NS>>;
  edges: LiveMap<string, LiveblocksEdge<E, ES>>;
}>;
