import type {
  DistributiveOmit,
  Json,
  LsonObject,
  Resolve,
  ToImmutable,
} from "@liveblocks/core";
import { LiveMap, LiveObject, shallow, Signal } from "@liveblocks/core";
import { useMutation, useStorage } from "@liveblocks/react";
import {
  useInitial,
  useSignal,
  useSuspendUntilStorageReady,
} from "@liveblocks/react/_private";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import { addEdge as defaultAddEdge } from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_STORAGE_KEY = "flow";

// React Flow `Node` properties that are purely ephemeral and local to each client
// instead of being written to Liveblocks Storage.
const NODE_LOCAL_KEYS = [
  "selected",
  "dragging",
  "measured",
  "resizing",
] as const satisfies (keyof Node)[number][];

// React Flow `Edge` properties that are purely ephemeral and local to each client
// instead of being written to Liveblocks Storage.
const EDGE_LOCAL_KEYS = ["selected"] as const satisfies (keyof Edge)[number][];

const EMPTY_ARRAY = [] as unknown[];

/**
 * The Liveblocks Storage representation of a React Flow `Node`.
 *
 * It doesn't include local-only properties.
 * The entire node and its `data` property are both stored as `LiveObject`s.
 */
export type LiveblocksNode<N extends Node = Node> = LiveObject<
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
export type LiveblocksEdge<E extends Edge = Edge> = LiveObject<
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
  N extends Node = Node,
  E extends Edge = Edge,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<N>>;
  edges: LiveMap<string, LiveblocksEdge<E>>;
}>;

type LocalNodes = Partial<Record<(typeof NODE_LOCAL_KEYS)[number], unknown>>;
type LocalEdges = Partial<Record<(typeof EDGE_LOCAL_KEYS)[number], unknown>>;

type UseLiveblocksFlowResult<
  N extends Node = Node,
  E extends Edge = Edge,
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
  }
>;

type LiveblocksFlowSuspenseResult<
  N extends Node = Node,
  E extends Edge = Edge,
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

export type NodeSyncConfig<N extends Node> = {
  // eslint-disable-next-line @typescript-eslint/ban-types -- Deliberate use of (string & {}) trick
  [key in (string & {}) | "*" | NonNullable<N["type"]>]?: SyncConfig;
  // TODO ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //      Please bare with me, this type does not yet work as intended.
};

export type EdgeSyncConfig<E extends Edge> = {
  // eslint-disable-next-line @typescript-eslint/ban-types -- Deliberate use of (string & {}) trick
  [key in (string & {}) | "*" | NonNullable<E["type"]>]?: SyncConfig;
  // TODO ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //      Please bare with me, this type does not yet work as intended.
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
};

function pick<T extends object, K extends PropertyKey>(
  from: T,
  keys: readonly K[]
): Partial<Record<K, unknown>> {
  const result: Partial<Record<K, unknown>> = {};

  for (const key of keys) {
    const value = (from as Record<PropertyKey, unknown>)[key];

    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return result;
}

function omit<T extends object, K extends PropertyKey>(
  from: T,
  keys: readonly K[]
): Omit<T, Extract<K, keyof T>> {
  const result = { ...from } as Partial<T>;

  for (const key of keys) {
    delete (result as Record<PropertyKey, unknown>)[key];
  }

  return result as Omit<T, Extract<K, keyof T>>;
}

function reconcile<T extends { id: string }>(cache: Map<string, T>, next: T) {
  const previous = cache.get(next.id);

  if (previous && shallow(previous, next)) {
    return previous;
  }

  cache.set(next.id, next);

  return next;
}

function merge<T extends { id: string }, L extends object>(
  cache: Map<string, T>,
  remote: ReadonlyMap<string, T>,
  local: Map<string, L>
): T[] {
  // Prune cached items that were deleted remotely.
  for (const id of cache.keys()) {
    if (!remote.has(id)) {
      cache.delete(id);
    }
  }

  // Prune local items that were deleted remotely.
  for (const id of local.keys()) {
    if (!remote.has(id)) {
      local.delete(id);
    }
  }

  // Reconcile remote and local items.
  return Array.from(remote.values(), (item) => {
    const localItem = local.get(item.id);

    return reconcile(
      cache,
      localItem ? (Object.assign({}, item, localItem) as T) : item
    );
  });
}

function updateLocalState<T extends object>(
  map: Map<string, T>,
  key: string,
  changes: T
): boolean {
  const next: Record<string, unknown> = {};

  for (const change in changes) {
    const value = (changes as Record<string, unknown>)[change];

    // `false` values aren't stored.
    if (value !== undefined && value !== false) {
      next[change] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    map.set(key, next as T);

    return true;
  } else {
    const hasItem = map.has(key);
    map.delete(key);

    return hasItem;
  }
}

// Converts a React Flow `Node` into a Liveblocks Storage version, omitting
// the fields that must stay local to each client.
function nodeToStorage<N extends Node>(node: N): LiveblocksNode<N> {
  const { data, ...rest } = omit(node, NODE_LOCAL_KEYS) as N;

  return new LiveObject({
    ...(rest as LsonObject),
    data: new LiveObject(data as LsonObject),
  }) as LiveblocksNode<N>;
}

// Converts a React Flow `Edge` into a Liveblocks Storage version, omitting
// the fields that must stay local to each client.
function edgeToStorage<E extends Edge>(edge: E): LiveblocksEdge<E> {
  const { data, ...rest } = omit(edge, EDGE_LOCAL_KEYS) as E;

  return new LiveObject({
    ...(rest as LsonObject),

    // `data` is optional on edges.
    data: data === undefined ? undefined : new LiveObject(data as LsonObject),
  }) as LiveblocksEdge<E>;
}

// Similar to React Flow's `applyNodeChanges()`, but with a split between local
// and remote changes.
// https://reactflow.dev/api-reference/utils/apply-node-changes
function applyNodeChanges<N extends Node>(args: {
  changes: NodeChange<N>[];
  nodes: LiveMap<string, LiveblocksNode<N>>;
  nextLocal: Map<string, Partial<LocalNodes>>;
  nodeCache: Map<string, N>;
}): boolean {
  const { changes, nodes, nextLocal, nodeCache } = args;

  let hasLocalChanged = false;

  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "replace":
        nodes.set(change.item.id, nodeToStorage(change.item));
        if (
          updateLocalState(
            nextLocal,
            change.item.id,
            pick(change.item, NODE_LOCAL_KEYS)
          )
        ) {
          hasLocalChanged = true;
        }
        break;

      case "remove":
        nodes.delete(change.id);
        nodeCache.delete(change.id);
        nextLocal.delete(change.id);
        hasLocalChanged = true;
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
          updateLocalState(nextLocal, change.id, {
            ...nextLocal.get(change.id),
            dragging: change.dragging,
          });
          hasLocalChanged = true;
        }

        break;
      }

      case "dimensions": {
        const node = nodes.get(change.id);
        const patch: Partial<LocalNodes> = {
          ...nextLocal.get(change.id),
        };

        if (
          node &&
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
          patch.measured = change.dimensions;
        }

        if (change.resizing !== undefined) {
          patch.resizing = change.resizing;
        }

        updateLocalState(nextLocal, change.id, patch);
        hasLocalChanged = true;
        break;
      }

      case "select":
        updateLocalState(nextLocal, change.id, {
          ...nextLocal.get(change.id),
          selected: change.selected,
        });
        hasLocalChanged = true;
        break;
    }
  }

  return hasLocalChanged;
}

// Similar to React Flow's `applyEdgeChanges()`, but with a split between local
// and remote changes.
// https://reactflow.dev/api-reference/utils/apply-edge-changes
function applyEdgeChanges<E extends Edge>(args: {
  changes: EdgeChange<E>[];
  edges: LiveMap<string, LiveblocksEdge<E>>;
  nextLocal: Map<string, Partial<LocalEdges>>;
  edgeCache: Map<string, E>;
}): boolean {
  const { changes, edges, nextLocal, edgeCache } = args;

  let hasLocalChanged = false;

  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "replace":
        edges.set(change.item.id, edgeToStorage(change.item));
        if (
          updateLocalState(
            nextLocal,
            change.item.id,
            pick(change.item, EDGE_LOCAL_KEYS)
          )
        ) {
          hasLocalChanged = true;
        }
        break;

      case "remove":
        edges.delete(change.id);
        edgeCache.delete(change.id);
        nextLocal.delete(change.id);
        hasLocalChanged = true;
        break;

      case "select":
        updateLocalState(nextLocal, change.id, {
          ...nextLocal.get(change.id),
          selected: change.selected,
        });
        hasLocalChanged = true;
        break;
    }
  }

  return hasLocalChanged;
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
  N extends Node = Node,
  E extends Edge = Edge,
>(nodes: N[] = [], edges: E[] = []): LiveblocksFlow<N, E> {
  return new LiveObject({
    nodes: new LiveMap(nodes.map((node) => [node.id, nodeToStorage(node)])),
    edges: new LiveMap(edges.map((edge) => [edge.id, edgeToStorage(edge)])),
  }) as LiveblocksFlow<N, E>;
}

/**
 * Returns a controlled React Flow state backed by Liveblocks Storage.
 *
 * @example
 * ```tsx
 * const { nodes, edges, onNodesChange, onEdgesChange, onConnect, isLoading } = useLiveblocksFlow();
 *
 * if (isLoading) {
 *   return <div>Loading…</div>
 * }
 *
 * return <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} />;
 * ```
 */
export function useLiveblocksFlow<N extends Node = Node, E extends Edge = Edge>(
  options: UseLiveblocksFlowOptions<N, E> = {}
): Resolve<UseLiveblocksFlowResult<N, E>> {
  type TFlow = LiveblocksFlow<N, E>;
  type TImmutableFlow = ToImmutable<LiveblocksFlow<N, E>>;

  const isStorageLoaded = useStorage(() => true) ?? false;

  // These options are not reactive, only their initial values are used.
  const frozenOptions = useInitial({
    nodes: options.nodes,
    edges: options.edges,
    storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
  });

  // Used to reconcile state changes with stable object references when the changes
  // are shallowly equal, preventing React Flow from re-rendering unchanged nodes and edges.
  const nodeCache = useRef<Map<string, N>>(new Map());
  const edgeCache = useRef<Map<string, E>>(new Map());

  // Local-only state lives in signals.
  const [localNodesΣ] = useState(
    () => new Signal(new Map<string, Partial<LocalNodes>>())
  );
  const [localEdgesΣ] = useState(
    () => new Signal(new Map<string, Partial<LocalEdges>>())
  );
  const localNodes = useSignal(localNodesΣ);
  const localEdges = useSignal(localEdgesΣ);

  // Remote state lives in Liveblocks Storage.
  const remoteNodesMap = useStorage((storage) => {
    const flow = storage[frozenOptions.storageKey] as
      | TImmutableFlow
      | undefined;

    return (flow?.nodes ?? null) as ReadonlyMap<string, N> | null;
  });
  const remoteEdgesMap = useStorage((storage) => {
    const flow = storage[frozenOptions.storageKey] as
      | TImmutableFlow
      | undefined;

    return (flow?.edges ?? null) as ReadonlyMap<string, E> | null;
  });

  // Merge remote and local layers to get the final state.
  const nodes = useMemo(
    () =>
      remoteNodesMap
        ? merge(nodeCache.current, remoteNodesMap, localNodes)
        : null,
    [remoteNodesMap, localNodes]
  );
  const edges = useMemo(
    () =>
      remoteEdgesMap
        ? merge(edgeCache.current, remoteEdgesMap, localEdges)
        : null,
    [remoteEdgesMap, localEdges]
  );

  const onNodesChange = useMutation(({ storage }, changes: NodeChange<N>[]) => {
    const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;

    if (!flow) {
      return;
    }

    const nextLocal = new Map(localNodesΣ.get());
    const hasLocalChanged = applyNodeChanges({
      changes,
      nodes: flow.get("nodes"),
      nextLocal,
      nodeCache: nodeCache.current,
    });

    if (hasLocalChanged) {
      localNodesΣ.set(nextLocal);
    }
  }, []);

  const onEdgesChange = useMutation(({ storage }, changes: EdgeChange<E>[]) => {
    const flow = storage.get(frozenOptions.storageKey) as TFlow | undefined;

    if (!flow) {
      return;
    }

    const nextLocal = new Map(localEdgesΣ.get());
    const hasLocalChanged = applyEdgeChanges({
      changes,
      edges: flow.get("edges"),
      nextLocal,
      edgeCache: edgeCache.current,
    });

    if (hasLocalChanged) {
      localEdgesΣ.set(nextLocal);
    }
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

    edges.set(newEdge.id, edgeToStorage(newEdge));
  }, []);

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

  return {
    nodes,
    edges,
    isLoading: !isStorageLoaded,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } as UseLiveblocksFlowResult<N, E>;
}

/**
 * Returns a controlled React Flow state backed by Liveblocks Storage.
 *
 * @example
 * ```tsx
 * const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useLiveblocksFlow();
 *
 * return <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} />;
 * ```
 */
export function useLiveblocksFlowSuspense<
  N extends Node = Node,
  E extends Edge = Edge,
>(
  options: UseLiveblocksFlowOptions<N, E> = {}
): Resolve<LiveblocksFlowSuspenseResult<N, E>> {
  const result = useLiveblocksFlow<N, E>(options);

  useSuspendUntilStorageReady();

  return {
    ...result,
    nodes: result.nodes ?? (EMPTY_ARRAY as N[]),
    edges: result.edges ?? (EMPTY_ARRAY as E[]),
    isLoading: false,
  };
}
