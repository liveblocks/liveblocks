import type {
  History,
  JsonObject,
  LsonObject,
  Resolve,
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
import { useEffect } from "react";

import { DEFAULT_STORAGE_KEY } from "./constants";
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

/**
 * Per-key sync configuration for node/edge `data` properties.
 *
 * true
 *   Sync this property to Liveblocks Storage. Arrays and objects in the value
 *   will be stored as LiveLists and LiveObjects, enabling fine-grained
 *   conflict-free merging. This is the default for all keys.
 *
 * false
 *   Don't sync this property. It stays local to the current client. This
 *   property will be `undefined` on other clients.
 *
 * "atomic"
 *   Sync this property, but treat it as an indivisible value. The entire value
 *   is replaced as a whole (last-writer-wins) instead of being recursively
 *   converted to LiveObjects/LiveLists. Use this when clients always replace
 *   the value entirely and never need concurrent sub-key merging.
 *
 * @example
 * ```ts
 * const sync: SyncConfig = {
 *   label: true,             // sync as LiveObject (default)
 *   createdAt: false,        // local-only
 *   shape: "atomic",         // replaced as a whole, no deep merge
 *   nested: {                // recursive config
 *     deep: false,
 *   },
 * };
 * ```
 */
export type SyncConfig = {
  [key: string]: boolean | "atomic" | SyncConfig | undefined;
};

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

// Narrowed LiveObject type for calling setLocal with known local keys.
// Needed because TypeScript can't resolve OptionalJsonKeys on generic
// LiveblocksNode<N>/LiveblocksEdge<E> types.
// XXX Remove these type hacks!
type NodeLocalLO = LiveObject<Node & LsonObject>;
type EdgeLocalLO = LiveObject<Edge & LsonObject>;

// Similar to React Flow's `applyNodeChanges()`, but writes local-only
// properties via `setLocal()` / `delete()` on the LiveObject directly.
// https://reactflow.dev/api-reference/utils/apply-node-changes
function applyNodeChanges<N extends Node>(
  changes: NodeChange<N>[],
  nodes: LiveMap<string, LiveblocksNode<N>>,
  history: History
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add":
        nodes.set(change.item.id, toLiveblocksNode(change.item));
        break;

      case "replace": {
        const existing = nodes.get(change.item.id);
        if (existing) {
          // Reconcile the data LiveObject in place — only mutates what changed
          const data = existing.get("data");
          if (data) {
            reconcileLiveRoot(data, (change.item.data ?? {}) as JsonObject);
          }
        } else {
          // Node doesn't exist yet — treat as add
          nodes.set(change.item.id, toLiveblocksNode(change.item));
        }
        break;
      }

      case "position": {
        const node = nodes.get(change.id);
        if (!node || !change.position) {
          break;
        }

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
        if (!node) {
          break;
        }

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

        const n = node as unknown as NodeLocalLO;

        if (change.dimensions !== undefined) {
          n.setLocal("measured", change.dimensions);
        }

        if (change.resizing !== undefined) {
          if (change.resizing) {
            history.pause();
          } else {
            history.resume();
          }
          n.setLocal("resizing", change.resizing);
        }

        break;
      }

      case "select":
        {
          const node = nodes.get(change.id);
          if (!node) break;
          const n = node as unknown as NodeLocalLO;
          n.setLocal("selected", change.selected);
        }
        break;

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
  edges: LiveMap<string, LiveblocksEdge<E>>
): void {
  for (const change of changes) {
    switch (change.type) {
      case "add": {
        edges.set(change.item.id, toLiveblocksEdge(change.item));
        break;
      }

      case "replace": {
        const existing = edges.get(change.item.id);
        if (existing) {
          const dataLO = existing.get("data");
          if (dataLO && change.item.data) {
            reconcileLiveRoot(
              dataLO as LiveObject<LsonObject>,
              change.item.data as JsonObject
            );
          }
        } else {
          edges.set(change.item.id, toLiveblocksEdge(change.item));
        }
        break;
      }

      case "select":
        {
          const edge = edges.get(change.id);
          if (!edge) break;
          const e = edge as unknown as EdgeLocalLO;
          e.setLocal("selected", change.selected);
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
export function createLiveblocksFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
>(nodes: N[] = [], edges: E[] = []): LiveblocksFlow<N, E> {
  return new LiveObject({
    nodes: new LiveMap(nodes.map((node) => [node.id, toLiveblocksNode(node)])),
    edges: new LiveMap(edges.map((edge) => [edge.id, toLiveblocksEdge(edge)])),
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

      applyNodeChanges(changes, flow.get("nodes"), history);
    },
    [history]
  );

  const onEdgesChange = useMutation(({ storage }, changes: EdgeChange<E>[]) => {
    const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;
    if (!flow) {
      return;
    }

    applyEdgeChanges(changes, flow.get("edges"));
  }, []);

  const onConnect = useMutation(({ storage }, connection: Connection) => {
    const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;

    if (!flow) {
      return;
    }

    const edges = flow.get("edges");

    // Check for duplicate connections.
    for (const edge of edges.values()) {
      if (
        edge.get("source") === connection.source &&
        edge.get("target") === connection.target &&
        (edge.get("sourceHandle") ?? null) ===
          (connection.sourceHandle ?? null) &&
        (edge.get("targetHandle") ?? null) === (connection.targetHandle ?? null)
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

    edges.set(newEdge.id, toLiveblocksEdge(newEdge));
  }, []);

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
    []
  );

  const setInitialStorage = useMutation(({ storage }) => {
    // Similarly to `initialStorage` on `Client.enterRoom` and `RoomProvider`, we only
    // initialize Storage if it doesn't already exist.
    if (storage.get(frozenOptions.storageKey) !== undefined) {
      return;
    }

    const initialNodes = frozenOptions.nodes?.initial ?? [];
    const initialEdges = frozenOptions.edges?.initial ?? [];

    // TODO: Apply sync config when creating initial storage (filter/serialize data keys)
    storage.set(
      frozenOptions.storageKey,
      createLiveblocksFlow(initialNodes, initialEdges)
    );
  }, []);

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
