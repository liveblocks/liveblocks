import type {
  Json,
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

type SyncedKeysFor<K, S extends SyncMode> = S extends SyncConfig
  ? K extends keyof S
    ? S[K] extends false
      ? never
      : K
    : K
  : K;

type SyncModeFor<K, S extends SyncMode> = S extends SyncConfig
  ? K extends keyof S
    ? S[K] extends SyncMode
      ? S[K]
      : true
    : true
  : S;

type ToLson<T, S extends SyncMode = true> = [S] extends [false]
  ? T
  : [S] extends ["atomic"]
    ? Json
    : T extends JsonScalar
      ? T
      : T extends
            | Date
            | RegExp
            | Function // eslint-disable-line @typescript-eslint/ban-types
            | Promise<any>
            | WeakMap<any, any>
            | WeakSet<any>
            | Map<any, any>
            | Set<any>
        ? never
        : T extends ReadonlyArray<infer E>
          ? LiveList<ToLson<E, S> & Lson>
          : T extends object
            ? LiveObject<
                {
                  [K in keyof T as SyncedKeysFor<K, S>]: ToLsonProperty<
                    T[K],
                    SyncModeFor<K, S>
                  >;
                } & LsonObject
              >
            : never;

type ToLiveElement<
  S extends SyncConfig,
  B extends Node | Edge,
  T extends B,
  D,
> = LiveObject<
  {
    [K in keyof B]: K extends keyof S
      ? T[K & keyof T]
      : K extends "data"
        ? D
        : ToLson<B[K]>;
  } & LsonObject
>;

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
