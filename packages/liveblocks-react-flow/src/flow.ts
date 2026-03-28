import type {
  History,
  JsonObject,
  Resolve,
  SyncConfig,
  SyncMode,
  ToImmutable,
} from "@liveblocks/core";
import { LiveMap, LiveObject, reconcileLiveRoot } from "@liveblocks/core";
import { useHistory, useMutation, useStorage } from "@liveblocks/react";
import {
  useInitial,
  useSuspendUntilStorageReady,
} from "@liveblocks/react/_private";
import type {
  BuiltInEdge,
  BuiltInNode,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnDelete,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import { addEdge as defaultAddEdge } from "@xyflow/react";
import { useEffect, useMemo } from "react";

import {
  DEFAULT_STORAGE_KEY,
  EDGE_BASE_CONFIG,
  NODE_BASE_CONFIG,
} from "./constants";
import { toLiveblocksEdge, toLiveblocksNode } from "./helpers";
import type { LiveblocksEdge, LiveblocksFlow, LiveblocksNode } from "./types";

const EMPTY_ARRAY = [] as unknown[];

type UseLiveblocksFlowResult<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
> = Resolve<
  (
    | {
        nodes: null;
        edges: null;
        isLoading: true;
      }
    | {
        nodes: N[];
        edges: E[];
        isLoading: false;
      }
  ) & {
    onNodesChange: OnNodesChange<N>;
    onEdgesChange: OnEdgesChange<E>;
    onConnect: OnConnect;
    onDelete: OnDelete<N, E>;
  }
>;

type LiveblocksFlowSuspenseResult<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
> = Extract<UseLiveblocksFlowResult<N, E>, { isLoading: false }>;

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

function mergeAndBuildDataConfigCache(
  base: SyncConfig,
  data?: Record<string, SyncConfig | undefined>
): (type: string | undefined) => SyncConfig {
  if (!data) return () => base;

  const dataFallback = data["*"];
  const fallback = dataFallback ? { ...base, data: dataFallback } : base;

  // Pre-compute full node/edge sync configs for all explicitly declared types
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

function buildNodeConfigCache<N extends Node>(
  /** The user-provided node data sync configuration, if any. */
  nodeDataConfig?: NodeSyncConfig<N>
): (type: string | undefined) => SyncConfig {
  return mergeAndBuildDataConfigCache(NODE_BASE_CONFIG, nodeDataConfig);
}

function buildEdgeConfigCache<E extends Edge>(
  /** The user-provided edge data sync configuration, if any. */
  edgeDataConfig?: EdgeSyncConfig<E>
): (type: string | undefined) => SyncConfig {
  return mergeAndBuildDataConfigCache(EDGE_BASE_CONFIG, edgeDataConfig);
}

type UseLiveblocksFlowOptions<N extends Node, E extends Edge> = {
  nodes?: {
    /**
     * The initial React Flow nodes.
     *
     * @example
     * ```tsx
     * const { ... } = useLiveblocksFlow({
     *   nodes: {
     *     initial: [
     *       { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
     *       { id: "2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
     *     ],
     *   },
     * });
     * ```
     */
    initial?: N[];
    /**
     * Per-type sync configuration for node data keys.
     *
     * Use `"*"` as a fallback for all node types. Type-specific entries are
     * deep-merged on top of `"*"`, with explicitly named keys taking
     * precedence.
     *
     * @example
     * ```tsx
     * const { ... } = useLiveblocksFlow({
     *   nodes: {
     *     sync: {
     *       // Fallback for all node types
     *       "*": { label: false },
     *
     *       // Override for "custom" nodes
     *       "custom": { color: false },
     *     },
     *   },
     * });
     * ```
     */
    // XXX Improve the example + match public documentation
    sync?: NodeSyncConfig<N>;
  };

  edges?: {
    initial?: E[];
    /**
     * Per-type sync configuration for edge data keys.
     *
     * Use `"*"` as a fallback for all edge types. Type-specific entries are
     * deep-merged on top of `"*"`, with explicitly named keys taking
     * precedence.
     *
     * @example
     * ```tsx
     * const { ... } = useLiveblocksFlow({
     *   edges: {
     *     sync: {
     *       // Fallback for all node types
     *       "*": { floating: false },
     *     },
     *   },
     * });
     * ```
     */
    // XXX Improve the example + match public documentation
    sync?: EdgeSyncConfig<E>;
  };

  /**
   * The key used to store the React Flow diagram in Liveblocks Storage.
   * Defaults to `"flow"`.
   */
  storageKey?: string;

  /**
   * When true, suspends until Storage is ready (use a React `Suspense`
   * boundary). Then `nodes` and `edges` are always arrays and `isLoading` is
   * always false.
   */
  suspense?: boolean;
};

// Similar to React Flow's `applyNodeChanges()`, but writes local-only
// properties via `setLocal()` / `delete()` on the LiveObject directly.
// https://reactflow.dev/api-reference/utils/apply-node-changes
function applyNodeChanges<N extends Node>(
  changes: NodeChange<N>[],
  nodes: LiveMap<string, LiveblocksNode<N>>,
  history: History,
  getNodeSyncConfig: (nodeType: string | undefined) => SyncConfig
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add": {
        const config = getNodeSyncConfig(change.item.type);
        nodes.set(change.item.id, toLiveblocksNode(change.item, config));
        break;
      }

      case "replace": {
        const config = getNodeSyncConfig(change.item.type);
        const existing = nodes.get(change.item.id);
        if (existing) {
          reconcileLiveRoot(
            existing,
            change.item as unknown as JsonObject,
            config
          );
        } else {
          nodes.set(change.item.id, toLiveblocksNode(change.item, config));
        }
        break;
      }

      case "position": {
        const node = nodes.get(change.id);
        if (!node || !change.position) break;

        const prev = node.get("position") as N["position"] | undefined;
        if (prev?.x !== change.position.x || prev?.y !== change.position.y) {
          node.set("position", change.position);
        }

        if (change.dragging !== undefined) {
          if (change.dragging) {
            history.pause();
          } else {
            history.resume();
          }
          // @ts-expect-error XXX Fix this later
          node.setLocal("dragging", change.dragging);
        }
        break;
      }

      case "dimensions": {
        const node = nodes.get(change.id);
        if (!node) break;

        if (
          change.dimensions !== undefined &&
          change.setAttributes !== undefined
        ) {
          if (
            change.setAttributes === true ||
            change.setAttributes === "width"
          ) {
            node.set("width", change.dimensions.width);
          }

          if (
            change.setAttributes === true ||
            change.setAttributes === "height"
          ) {
            node.set("height", change.dimensions.height);
          }
        }

        if (change.dimensions !== undefined) {
          // @ts-expect-error XXX Fix this later
          node.setLocal("measured", change.dimensions);
        }

        if (change.resizing !== undefined) {
          if (change.resizing) {
            history.pause();
          } else {
            history.resume();
          }
          // @ts-expect-error XXX Fix this later
          node.setLocal("resizing", change.resizing);
        }

        break;
      }

      case "select": {
        const node = nodes.get(change.id);
        if (!node) break;

        // @ts-expect-error XXX Fix this later
        node.setLocal("selected", change.selected);
        break;
      }

      case "remove":
        // Removals are handled by onDelete for atomic undo
        break;
    }
  }
}

// Similar to React Flow's `applyEdgeChanges()`, but writes local-only
// properties via `setLocal()` / `delete()` on the LiveObject directly.
// https://reactflow.dev/api-reference/utils/apply-edge-changes
function applyEdgeChanges<E extends Edge>(
  changes: EdgeChange<E>[],
  edges: LiveMap<string, LiveblocksEdge<E>>,
  getEdgeSyncConfig: (type: string | undefined) => SyncConfig
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add": {
        const config = getEdgeSyncConfig(change.item.type);
        edges.set(change.item.id, toLiveblocksEdge(change.item, config));
        break;
      }

      case "replace": {
        const config = getEdgeSyncConfig(change.item.type);
        const existing = edges.get(change.item.id);
        if (existing) {
          reconcileLiveRoot(
            existing,
            change.item as unknown as JsonObject,
            config
          );
        } else {
          edges.set(change.item.id, toLiveblocksEdge(change.item, config));
        }
        break;
      }

      case "select":
        {
          const edge = edges.get(change.id);
          if (!edge) break;
          // @ts-expect-error XXX Fix this later
          edge.setLocal("selected", change.selected);
        }
        break;

      case "remove":
        // Removals are handled by onDelete for atomic undo
        break;
    }
  }
}

/**
 * Creates a Liveblocks Storage representation of a React Flow diagram from nodes and edges.
 *
 * @example
 * ```tsx
 * <RoomProvider
 *   initialStorage={{
 *     flow: createLiveblocksFlow(initialNodes, initialEdges),
 *   }}
 * />
 * ```
 */
// XXX Decide on Monday: can we kill this helper, or do we need to keep it?
export function createLiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
>(
  nodes: N[] = [],
  edges: E[] = [],
  resolveNodeConfig?: (type: string | undefined) => SyncConfig,
  resolveEdgeConfig?: (type: string | undefined) => SyncConfig
): LiveblocksFlow<N, E> {
  const nodeConfig = resolveNodeConfig ?? (() => NODE_BASE_CONFIG);
  const edgeConfig = resolveEdgeConfig ?? (() => EDGE_BASE_CONFIG);
  return new LiveObject({
    nodes: new LiveMap(
      nodes.map((node) => [
        node.id,
        toLiveblocksNode(node, nodeConfig(node.type)),
      ])
    ),
    edges: new LiveMap(
      edges.map((edge) => [
        edge.id,
        toLiveblocksEdge(edge, edgeConfig(edge.type)),
      ])
    ),
  }) as LiveblocksFlow<N, E>;
}

/**
 * Returns a controlled React Flow state backed by Liveblocks Storage.
 *
 * @example
 * ```tsx
 * const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete, isLoading } = useLiveblocksFlow();
 *
 * if (isLoading) {
 *   return <div>Loading…</div>
 * }
 *
 * return <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onDelete={onDelete} />;
 * ```
 * Pass `{ suspense: true }` to suspend until Storage is ready, `nodes` and `edges` will never be `null`.
 *
 * @example
 * ```tsx
 * const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
 *   useLiveblocksFlow({ suspense: true });
 *
 * return <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onDelete={onDelete} />;
 * ```
 */
export function useLiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
>(
  options?: UseLiveblocksFlowOptions<N, E> & { suspense?: false }
): Resolve<UseLiveblocksFlowResult<N, E>>;
export function useLiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
>(
  options: UseLiveblocksFlowOptions<N, E> & { suspense: true }
): Resolve<LiveblocksFlowSuspenseResult<N, E>>;
export function useLiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
>(
  options: UseLiveblocksFlowOptions<N, E> = {}
): Resolve<UseLiveblocksFlowResult<N, E> | LiveblocksFlowSuspenseResult<N, E>> {
  type TFlow = LiveblocksFlow<N, E>;
  type TImmutableFlow = ToImmutable<LiveblocksFlow<N, E>>;

  const history = useHistory();
  const isStorageLoaded = useStorage(() => true) ?? false;

  // These options are not reactive, only their initial values are used.
  const frozenOptions = useInitial({
    nodes: options.nodes,
    edges: options.edges,
    storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
    suspense: options.suspense ?? false,
  });

  // Pre-compute sync config caches once (not on every render)
  const [getNodeSyncConfig, getEdgeSyncConfig] = useMemo(
    () =>
      [
        buildNodeConfigCache(frozenOptions.nodes?.sync),
        buildEdgeConfigCache(frozenOptions.edges?.sync),
      ] as const,
    [frozenOptions]
  );

  // Storage already includes local overlays via toImmutable(), so no
  // separate local layer is needed. Individual node/edge immutable references
  // are already stable (only change when the underlying LiveObject changes).
  const nodes = useStorage((storage) => {
    const flow = storage[frozenOptions.storageKey] as
      | TImmutableFlow
      | undefined;
    return flow?.nodes ? ([...flow.nodes.values()] as N[]) : null;
  });
  const edges = useStorage((storage) => {
    const flow = storage[frozenOptions.storageKey] as
      | TImmutableFlow
      | undefined;
    return flow?.edges ? ([...flow.edges.values()] as E[]) : null;
  });

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<N>[]) => {
      const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;
      if (!flow) {
        return;
      }

      applyNodeChanges(changes, flow.get("nodes"), history, getNodeSyncConfig);
    },
    [history, frozenOptions, getNodeSyncConfig]
  );

  const onEdgesChange = useMutation(
    ({ storage }, changes: EdgeChange<E>[]) => {
      const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;
      if (!flow) {
        return;
      }

      applyEdgeChanges(changes, flow.get("edges"), getEdgeSyncConfig);
    },
    [frozenOptions, getEdgeSyncConfig]
  );

  const onConnect = useMutation(
    ({ storage }, connection: Connection) => {
      const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;
      if (!flow) {
        return;
      }

      // XXX Discuss with Marc on Monday: why is this necessary?
      const edges = flow.get("edges");
      for (const edge of edges.values()) {
        if (
          edge.get("source") === connection.source &&
          edge.get("target") === connection.target &&
          (edge.get("sourceHandle") ?? null) ===
            (connection.sourceHandle ?? null) &&
          (edge.get("targetHandle") ?? null) ===
            (connection.targetHandle ?? null)
        ) {
          return;
        }
      }

      // Delegate to React Flow's own `addEdge` helper for consistent default
      // edge ID generation, passing an empty array since de-duplication is
      // already handled above.
      const [newEdge] = defaultAddEdge(connection, [] as E[]);
      if (!newEdge) {
        return;
      }

      const config = getEdgeSyncConfig(newEdge.type);
      edges.set(newEdge.id, toLiveblocksEdge(newEdge, config));
    },
    [frozenOptions.storageKey, getEdgeSyncConfig]
  );

  const onDelete = useMutation(
    ({ storage }, params: { nodes: N[]; edges: E[] }) => {
      const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;
      if (!flow) {
        return;
      }

      const nodesMap = flow.get("nodes");
      const edgesMap = flow.get("edges");

      for (const edge of params.edges) {
        edgesMap.delete(edge.id);
      }

      for (const node of params.nodes) {
        nodesMap.delete(node.id);
      }
    },
    [frozenOptions.storageKey]
  );

  const setInitialStorage = useMutation(
    ({ storage }) => {
      // Similarly to `initialStorage` on `Client.enterRoom` and `RoomProvider`, we only
      // initialize Storage if it doesn't already exist.
      if (storage.get(frozenOptions.storageKey) !== undefined) {
        return;
      }

      const initialNodes = frozenOptions.nodes?.initial ?? [];
      const initialEdges = frozenOptions.edges?.initial ?? [];

      storage.set(
        frozenOptions.storageKey,
        createLiveblocksFlow(
          initialNodes,
          initialEdges,
          getNodeSyncConfig,
          getEdgeSyncConfig
        )
      );
    },
    [frozenOptions, getNodeSyncConfig, getEdgeSyncConfig]
  );

  useEffect(() => {
    if (isStorageLoaded) {
      setInitialStorage();
    }
  }, [isStorageLoaded, setInitialStorage]);

  if (frozenOptions.suspense) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- `suspense` is frozen so this branch is stable
    useSuspendUntilStorageReady();
  }

  return {
    nodes: frozenOptions.suspense ? (nodes ?? (EMPTY_ARRAY as N[])) : nodes,
    edges: frozenOptions.suspense ? (edges ?? (EMPTY_ARRAY as E[])) : edges,
    isLoading: frozenOptions.suspense ? false : !isStorageLoaded,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
  } as UseLiveblocksFlowResult<N, E> | LiveblocksFlowSuspenseResult<N, E>;
}
