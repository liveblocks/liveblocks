import type {
  History,
  Json,
  LsonObject,
  Resolve,
  ToImmutable,
} from "@liveblocks/core";
import { LiveMap, LiveObject } from "@liveblocks/core";
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

import {
  DEFAULT_STORAGE_KEY,
  EDGE_LOCAL_KEYS,
  NODE_LOCAL_KEYS,
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

/**
 * A pair of callbacks for custom serialization of non-JSON-serializable
 * values. Called right before syncing a value and right after receiving it
 * from other clients.
 */
export type CustomSerializationConfig<T = unknown> = {
  serialize: (value: T) => Json;
  deserialize: (value: Json) => T;
};

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
 * "readonly"
 *   Sync this property, but store arrays and objects as plain JSON instead of
 *   converting them to LiveLists/LiveObjects. This can be more performant if
 *   clients only replace this property as a whole and never mutate fields
 *   inside it.
 *
 * { serialize, deserialize }
 *   Sync with custom serialization. `serialize` is called right before storing
 *   the value; `deserialize` is called right after receiving it from other
 *   clients.
 *
 * @example
 * ```ts
 * const sync: SyncConfig = {
 *   label: true,             // sync as LiveObject (default)
 *   createdAt: false,        // local-only
 *   color: {                 // custom serde
 *     serialize: (c) => c.toHex(),
 *     deserialize: (hex) => Color.fromHex(hex),
 *   },
 *   nested: {                // recursive config
 *     deep: false,
 *   },
 * };
 * ```
 */
export type SyncConfig = {
  [key: string]:
    | boolean
    | "readonly"
    | CustomSerializationConfig
    | SyncConfig
    | undefined;
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

// Narrowed LiveObject type for calling setLocal/delete with known local keys.
// Needed because TypeScript can't resolve OptionalJsonKeys on generic
// LiveblocksNode<N>/LiveblocksEdge<E> types.
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
      case "replace": {
        const lo = toLiveblocksNode(change.item);
        nodes.set(change.item.id, lo);
        const n = lo as unknown as NodeLocalLO;
        for (const key of NODE_LOCAL_KEYS) {
          const value = change.item[key];
          if (value !== undefined && value !== false) {
            n.setLocal(key, value);
          }
        }
        break;
      }

      // Removals are handled by onDelete for atomic undo
      case "remove":
        break;

      case "position": {
        const node = nodes.get(change.id);

        if (!node || !change.position) {
          break;
        }

        const previous = node.get("position") as N["position"] | undefined;

        if (
          previous?.x !== change.position.x ||
          previous?.y !== change.position.y
        ) {
          node.set("position", change.position);
        }

        if (change.dragging !== undefined) {
          const n = node as unknown as NodeLocalLO;
          if (change.dragging) {
            history.pause();
          } else {
            history.resume();
          }
          n.setLocal("dragging", change.dragging);
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
      case "add":
      case "replace": {
        const lo = toLiveblocksEdge(change.item);
        edges.set(change.item.id, lo);
        const e = lo as unknown as EdgeLocalLO;
        for (const key of EDGE_LOCAL_KEYS) {
          const value = change.item[key];
          if (value !== undefined && value !== false) {
            e.setLocal(key, value);
          }
        }
        break;
      }

      // Removals are handled by onDelete for atomic undo
      case "remove":
        break;

      case "select":
        {
          const edge = edges.get(change.id);
          if (!edge) break;
          const e = edge as unknown as EdgeLocalLO;
          e.setLocal("selected", change.selected);
        }
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
