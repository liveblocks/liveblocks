import type {
  History,
  JsonObject,
  Resolve,
  ToImmutable,
} from "@liveblocks/core";
import { kInternal, LiveMap, LiveObject } from "@liveblocks/core";
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
import { toLiveblocksInternalEdge, toLiveblocksInternalNode } from "./helpers";
import type {
  EdgeSyncConfig,
  InternalLiveblocksEdge,
  InternalLiveblocksFlow,
  InternalLiveblocksNode,
  NodeSyncConfig,
  SyncConfig,
} from "./types";

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
     *       "*": {
     *         label: false,  // Don't sync node.data.label
     *       },
     *
     *       // Override for node.type === 'myCustomNode'
     *       // This will also not sync `myCustomNode.data.label` (because of the fallback above)
     *       myCustomNode: {
     *         showPreview: false,  // Don't sync myCustomNode.data.showPreview
     *       },
     *     },
     *   },
     * });
     * ```
     */
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
     *       // Fallback for all edge types
     *       "*": {
     *         hovered: false,  // Don't sync edge.data.hovered
     *       },
     *
     *       // Override for edge.type === 'myCustomEdge'
     *       // This will also not sync `myCustomEdge.data.hovered` (because of the fallback above)
     *       myCustomEdge: {
     *         isHighlighted: false,  // Don't sync myCustomEdge.data.isHighlighted
     *       },
     *     },
     *   },
     * });
     * ```
     */
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
  nodes: LiveMap<string, InternalLiveblocksNode>,
  history: History,
  getNodeSyncConfig: (nodeType: string | undefined) => SyncConfig
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "replace": {
        const config = getNodeSyncConfig(change.item.type);
        const existing = nodes.get(change.item.id);
        if (existing) {
          existing.reconcile(change.item as unknown as JsonObject, config);
        } else {
          nodes.set(
            change.item.id,
            toLiveblocksInternalNode(change.item, config)
          );
        }
        break;
      }

      case "position": {
        const node = nodes.get(change.id);
        if (!node || !change.position) break;

        if (change.position !== undefined) {
          node.set("position", change.position);
        }

        if (change.dragging !== undefined) {
          if (change.dragging) {
            history.pause();
          } else {
            history.resume();
          }
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
          node.setLocal("measured", change.dimensions);
        }

        if (change.resizing !== undefined) {
          if (change.resizing) {
            history.pause();
          } else {
            history.resume();
          }
          node.setLocal("resizing", change.resizing);
        }

        break;
      }

      case "select": {
        const node = nodes.get(change.id);
        if (!node) break;

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
  edges: LiveMap<string, InternalLiveblocksEdge>,
  getEdgeSyncConfig: (type: string | undefined) => SyncConfig
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add": {
        const config = getEdgeSyncConfig(change.item.type);
        edges.set(
          change.item.id,
          toLiveblocksInternalEdge(change.item, config)
        );
        break;
      }

      case "replace": {
        const config = getEdgeSyncConfig(change.item.type);
        const existing = edges.get(change.item.id);
        if (existing) {
          existing.reconcile(change.item as unknown as JsonObject, config);
        } else {
          edges.set(
            change.item.id,
            toLiveblocksInternalEdge(change.item, config)
          );
        }
        break;
      }

      case "select":
        {
          const edge = edges.get(change.id);
          if (!edge) break;
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
      | ToImmutable<InternalLiveblocksFlow>
      | undefined;
    return flow?.nodes ? ([...flow.nodes.values()] as unknown as N[]) : null;
  });
  const edges = useStorage((storage) => {
    const flow = storage[frozenOptions.storageKey] as
      | ToImmutable<InternalLiveblocksFlow>
      | undefined;
    return flow?.edges ? ([...flow.edges.values()] as unknown as E[]) : null;
  });

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<N>[]) => {
      const flow = storage.get(frozenOptions.storageKey) as
        | InternalLiveblocksFlow
        | undefined;
      if (!flow) {
        return;
      }

      applyNodeChanges(changes, flow.get("nodes"), history, getNodeSyncConfig);
    },
    [history, frozenOptions, getNodeSyncConfig]
  );

  const onEdgesChange = useMutation(
    ({ storage }, changes: EdgeChange<E>[]) => {
      const flow = storage.get(frozenOptions.storageKey) as
        | InternalLiveblocksFlow
        | undefined;
      if (!flow) {
        return;
      }

      applyEdgeChanges(changes, flow.get("edges"), getEdgeSyncConfig);
    },
    [frozenOptions, getEdgeSyncConfig]
  );

  const onConnect = useMutation(
    ({ storage }, connection: Connection) => {
      const flow = storage.get(frozenOptions.storageKey) as
        | InternalLiveblocksFlow
        | undefined;
      if (!flow) {
        return;
      }

      // Delegate to React Flow's own `addEdge` helper for consistent default
      // edge ID generation, passing an empty array since de-duplication is
      // already handled above.
      const [newEdge] = defaultAddEdge(connection, [] as E[]);
      if (!newEdge) {
        return;
      }

      const edges = flow.get("edges");
      const config = getEdgeSyncConfig(newEdge.type);
      edges.set(newEdge.id, toLiveblocksInternalEdge(newEdge, config));
    },
    [frozenOptions.storageKey, getEdgeSyncConfig]
  );

  const onDelete = useMutation(
    ({ storage }, params: { nodes: N[]; edges: E[] }) => {
      const flow = storage.get(frozenOptions.storageKey) as
        | InternalLiveblocksFlow
        | undefined;
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
        new LiveObject({
          nodes: new LiveMap(
            initialNodes.map((node) => [
              node.id,
              toLiveblocksInternalNode(node, getNodeSyncConfig(node.type)),
            ])
          ),
          edges: new LiveMap(
            initialEdges.map((edge) => [
              edge.id,
              toLiveblocksInternalEdge(edge, getEdgeSyncConfig(edge.type)),
            ])
          ),
        })
      );
    },
    [frozenOptions, getNodeSyncConfig, getEdgeSyncConfig]
  );

  useEffect(() => {
    if (isStorageLoaded) {
      history[kInternal].withoutHistory(() => {
        setInitialStorage();
      });
    }
  }, [isStorageLoaded, setInitialStorage, history]);

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
