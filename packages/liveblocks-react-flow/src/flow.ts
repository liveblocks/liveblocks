import {
  type JsonObject,
  LiveMap,
  LiveObject,
  type LsonObject,
  type Resolve,
  shallow,
  Signal,
  type ToImmutable,
} from "@liveblocks/core";
import { useMutation, useStorage } from "@liveblocks/react";
import {
  useInitial,
  useSignal,
  useSuspendUntilStorageReady,
} from "@liveblocks/react/_private";
import {
  addEdge as defaultAddEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
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

type SerializableNode = Node<JsonObject>;
type SerializableEdge = Edge<JsonObject>;

/**
 * Extracts all keys across all members of a union type.
 * Standard `keyof` on a union gives only common keys.
 */
type KeysOfUnion<T> = T extends unknown ? keyof T : never;

/**
 * Config type for choosing which data keys to sync.
 * Keys set to `true` are synced; omitted keys stay local per client.
 */
type DataSyncConfig<TData> = Partial<
  Record<Extract<KeysOfUnion<TData>, string>, true>
>;

/**
 * The Liveblocks Storage representation of a React Flow `Node`.
 *
 * It doesn't include local-only properties and is stored as a `LiveObject`.
 * When `TDataSyncedKeys` is specified, only those data keys are synced.
 */
export type LiveblocksNode<
  TNode extends SerializableNode = SerializableNode,
  TDataSyncedKeys extends string = Extract<keyof TNode["data"], string>,
> = LiveObject<
  Omit<
    Node<Pick<TNode["data"], TDataSyncedKeys & keyof TNode["data"]>>,
    (typeof NODE_LOCAL_KEYS)[number]
  > &
    LsonObject
>;

/**
 * The Liveblocks Storage representation of a React Flow `Edge`.
 *
 * It doesn't include local-only properties and is stored as a `LiveObject`.
 * When `TDataSyncedKeys` is specified, only those data keys are synced.
 */
export type LiveblocksEdge<
  TEdge extends SerializableEdge = SerializableEdge,
  TDataSyncedKeys extends string = Extract<
    keyof NonNullable<TEdge["data"]>,
    string
  >,
> = LiveObject<
  Omit<
    Edge<
      Pick<
        NonNullable<TEdge["data"]>,
        TDataSyncedKeys & keyof NonNullable<TEdge["data"]>
      >
    >,
    (typeof EDGE_LOCAL_KEYS)[number]
  > &
    LsonObject
>;

/**
 * The Liveblocks Storage representation of a React Flow diagram made of nodes and edges.
 *
 * Nodes and edges are stored as `LiveMap`s keyed by their IDs, enabling
 * fine-grained conflict-free updates from multiple clients simultaneously.
 */
export type LiveblocksFlow<
  TNode extends SerializableNode = SerializableNode,
  TEdge extends SerializableEdge = SerializableEdge,
  TNodeDataSyncedKeys extends string = Extract<keyof TNode["data"], string>,
  TEdgeDataSyncedKeys extends string = Extract<
    keyof NonNullable<TEdge["data"]>,
    string
  >,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<TNode, TNodeDataSyncedKeys>>;
  edges: LiveMap<string, LiveblocksEdge<TEdge, TEdgeDataSyncedKeys>>;
}>;

type LocalNodes = Partial<Record<(typeof NODE_LOCAL_KEYS)[number], unknown>>;
type LocalEdges = Partial<Record<(typeof EDGE_LOCAL_KEYS)[number], unknown>>;

type UseLiveblocksFlowResult<
  TNode extends SerializableNode = SerializableNode,
  TEdge extends SerializableEdge = SerializableEdge,
> = Resolve<
  (
    | {
        nodes: null;
        edges: null;
        isLoading: true;
      }
    | {
        nodes: TNode[];
        edges: TEdge[];
        isLoading: false;
      }
  ) & {
    onNodesChange: OnNodesChange<TNode>;
    onEdgesChange: OnEdgesChange<TEdge>;
    onConnect: OnConnect;
  }
>;

type LiveblocksFlowSuspenseResult<
  TNode extends SerializableNode = SerializableNode,
  TEdge extends SerializableEdge = SerializableEdge,
> = Extract<UseLiveblocksFlowResult<TNode, TEdge>, { isLoading: false }>;

type UseLiveblocksFlowOptions<
  TNode extends SerializableNode,
  TEdge extends SerializableEdge,
  TNodeDataSync extends DataSyncConfig<TNode["data"]>,
  TEdgeDataSync extends DataSyncConfig<NonNullable<TEdge["data"]>>,
> = {
  /**
   * Initial nodes and sync configuration.
   *
   * @example
   * ```tsx
   * useLiveblocksFlow({
   *   nodes: {
   *     initial: [
   *       { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
   *     ],
   *     sync: { data: { label: true } },
   *   },
   * });
   * ```
   */
  nodes?: {
    initial?: TNode[];
    sync?: {
      data?: TNodeDataSync;
    };
  };

  /**
   * Initial edges and sync configuration.
   */
  edges?: {
    initial?: TEdge[];
    sync?: {
      data?: TEdgeDataSync;
    };
  };

  /**
   * The key used to store the React Flow diagram in Liveblocks Storage.
   * Defaults to `"flow"`.
   */
  storageKey?: string;
};

type StorageRoot<
  TNode extends SerializableNode,
  TEdge extends SerializableEdge,
  TNodeDataSyncedKeys extends string = Extract<keyof TNode["data"], string>,
  TEdgeDataSyncedKeys extends string = Extract<
    keyof NonNullable<TEdge["data"]>,
    string
  >,
> = LiveObject<{
  [key: string]:
    | LiveblocksFlow<
        TNode,
        TEdge,
        TNodeDataSyncedKeys,
        TEdgeDataSyncedKeys
      >
    | undefined;
}>;

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
  local: ReadonlyMap<string, L>,
  localData?: ReadonlyMap<string, Record<string, unknown>>
): T[] {
  // Prune items that are no longer present remotely.
  for (const id of cache.keys()) {
    if (!remote.has(id)) {
      cache.delete(id);
    }
  }

  // Merge remote and local items.
  return Array.from(remote.values(), (item) => {
    const localItem = local.get(item.id);
    const localDataItem = localData?.get(item.id);

    let merged = localItem ? (Object.assign({}, item, localItem) as T) : item;

    if (localDataItem && "data" in merged) {
      merged = {
        ...merged,
        data: { ...(merged as { data?: object }).data, ...localDataItem },
      } as T;
    }

    return reconcile(cache, merged);
  });
}

function setOrDelete<T extends object>(
  map: Map<string, T>,
  key: string,
  changes: T
): void {
  const next: Record<string, unknown> = {};

  for (const change in changes) {
    const value = (changes as Record<string, unknown>)[change];

    // Falsy values are deleted from the map.
    if (value) {
      next[change] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    map.set(key, next as T);
  } else {
    map.delete(key);
  }
}

// Converts a React Flow `Node` into a Liveblocks Storage version, omitting
// the fields that must stay local to each client.
// When dataSyncedKeys is provided, only those data keys are stored.
function nodeToStorage<TNode extends SerializableNode>(
  node: TNode,
  dataSyncedKeys?: readonly string[]
): LiveblocksNode<TNode> {
  const stored = omit(node, NODE_LOCAL_KEYS) as Record<string, unknown>;
  if (dataSyncedKeys) {
    stored.data = pick(node.data as object, dataSyncedKeys);
  }
  return new LiveObject(stored as unknown as LsonObject) as LiveblocksNode<TNode>;
}

// Converts a React Flow `Edge` into a Liveblocks Storage version, omitting
// the fields that must stay local to each client.
// When dataSyncedKeys is provided, only those data keys are stored.
function edgeToStorage<TEdge extends SerializableEdge>(
  edge: TEdge,
  dataSyncedKeys?: readonly string[]
): LiveblocksEdge<TEdge> {
  const stored = omit(edge, EDGE_LOCAL_KEYS) as Record<string, unknown>;
  if (dataSyncedKeys && edge.data) {
    stored.data = pick(edge.data as object, dataSyncedKeys);
  }
  return new LiveObject(stored as unknown as LsonObject) as LiveblocksEdge<TEdge>;
}

// Similar to React Flow's `applyNodeChanges()`, but with a split between local
// and remote changes.
// https://reactflow.dev/api-reference/utils/apply-node-changes
function applyNodeChanges<TNode extends SerializableNode>(args: {
  changes: NodeChange<TNode>[];
  nodes: LiveMap<string, LiveblocksNode<TNode>>;
  nextLocal: Map<string, Partial<LocalNodes>>;
  nextLocalData?: Map<string, Record<string, unknown>>;
  nodeCache: Map<string, TNode>;
  dataSyncedKeys?: readonly string[];
}): boolean {
  const {
    changes,
    nodes,
    nextLocal,
    nextLocalData,
    nodeCache,
    dataSyncedKeys,
  } = args;

  let hasLocalChanged = false;

  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "replace":
        nodes.set(change.item.id, nodeToStorage(change.item, dataSyncedKeys));
        setOrDelete(
          nextLocal,
          change.item.id,
          pick(change.item, NODE_LOCAL_KEYS)
        );
        if (dataSyncedKeys && nextLocalData) {
          const localData = omit(change.item.data as object, dataSyncedKeys);
          if (Object.keys(localData).length > 0) {
            nextLocalData.set(change.item.id, localData as Record<string, unknown>);
          } else {
            nextLocalData.delete(change.item.id);
          }
        }
        hasLocalChanged = true;
        break;

      case "remove":
        nodes.delete(change.id);
        nodeCache.delete(change.id);
        nextLocal.delete(change.id);
        nextLocalData?.delete(change.id);
        hasLocalChanged = true;
        break;

      case "position": {
        const node = nodes.get(change.id);

        if (!node || !change.position) {
          break;
        }

        const previous = node.get("position") as TNode["position"] | undefined;

        if (
          previous?.x !== change.position.x ||
          previous?.y !== change.position.y
        ) {
          node.set("position", change.position);
        }

        if (change.dragging !== undefined) {
          setOrDelete(nextLocal, change.id, {
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

        setOrDelete(nextLocal, change.id, patch);
        hasLocalChanged = true;
        break;
      }

      case "select":
        setOrDelete(nextLocal, change.id, {
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
function applyEdgeChanges<TEdge extends SerializableEdge>(args: {
  changes: EdgeChange<TEdge>[];
  edges: LiveMap<string, LiveblocksEdge<TEdge>>;
  nextLocal: Map<string, Partial<LocalEdges>>;
  nextLocalData?: Map<string, Record<string, unknown>>;
  edgeCache: Map<string, TEdge>;
  dataSyncedKeys?: readonly string[];
}): boolean {
  const {
    changes,
    edges,
    nextLocal,
    nextLocalData,
    edgeCache,
    dataSyncedKeys,
  } = args;

  let hasLocalChanged = false;

  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "replace":
        edges.set(change.item.id, edgeToStorage(change.item, dataSyncedKeys));
        setOrDelete(
          nextLocal,
          change.item.id,
          pick(change.item, EDGE_LOCAL_KEYS)
        );
        if (dataSyncedKeys && nextLocalData && change.item.data) {
          const localData = omit(change.item.data as object, dataSyncedKeys);
          if (Object.keys(localData).length > 0) {
            nextLocalData.set(change.item.id, localData as Record<string, unknown>);
          } else {
            nextLocalData.delete(change.item.id);
          }
        }
        hasLocalChanged = true;
        break;

      case "remove":
        edges.delete(change.id);
        edgeCache.delete(change.id);
        nextLocal.delete(change.id);
        nextLocalData?.delete(change.id);
        hasLocalChanged = true;
        break;

      case "select":
        setOrDelete(nextLocal, change.id, {
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
  TNode extends SerializableNode = SerializableNode,
  TEdge extends SerializableEdge = SerializableEdge,
  const TNodeDataSync extends DataSyncConfig<TNode["data"]> = DataSyncConfig<
    TNode["data"]
  >,
  const TEdgeDataSync extends DataSyncConfig<
    NonNullable<TEdge["data"]>
  > = DataSyncConfig<NonNullable<TEdge["data"]>>,
>(
  nodes: TNode[] = [],
  edges: TEdge[] = [],
  options?: {
    nodeDataSync?: TNodeDataSync;
    edgeDataSync?: TEdgeDataSync;
  }
): LiveblocksFlow<
  TNode,
  TEdge,
  Extract<keyof TNodeDataSync, string>,
  Extract<keyof TEdgeDataSync, string>
> {
  const nodeDataSyncedKeys = options?.nodeDataSync
    ? Object.keys(options.nodeDataSync)
    : undefined;
  const edgeDataSyncedKeys = options?.edgeDataSync
    ? Object.keys(options.edgeDataSync)
    : undefined;

  const flow = new LiveObject({
    nodes: new LiveMap(
      nodes.map((node) => [node.id, nodeToStorage(node, nodeDataSyncedKeys)])
    ),
    edges: new LiveMap(
      edges.map((edge) => [edge.id, edgeToStorage(edge, edgeDataSyncedKeys)])
    ),
  });
  return flow as LiveblocksFlow<
    TNode,
    TEdge,
    Extract<keyof TNodeDataSync, string>,
    Extract<keyof TEdgeDataSync, string>
  >;
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
export function useLiveblocksFlow<
  TNode extends SerializableNode = SerializableNode,
  TEdge extends SerializableEdge = SerializableEdge,
  const TNodeDataSync extends DataSyncConfig<TNode["data"]> = DataSyncConfig<
    TNode["data"]
  >,
  const TEdgeDataSync extends DataSyncConfig<
    NonNullable<TEdge["data"]>
  > = DataSyncConfig<NonNullable<TEdge["data"]>>,
>(
  options: UseLiveblocksFlowOptions<
    TNode,
    TEdge,
    TNodeDataSync,
    TEdgeDataSync
  > = {}
): Resolve<UseLiveblocksFlowResult<TNode, TEdge>> {
  type TStorageRoot = StorageRoot<
    TNode,
    TEdge,
    Extract<keyof TNodeDataSync, string>,
    Extract<keyof TEdgeDataSync, string>
  >;

  const isStorageLoaded = useStorage(() => true) ?? false;

  // These options are not reactive, only their initial values are used.
  const frozenOptions = useInitial({
    nodes: options.nodes,
    edges: options.edges,
    storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
  });

  const nodeDataSyncedKeys = frozenOptions.nodes?.sync?.data
    ? Object.keys(frozenOptions.nodes.sync.data)
    : undefined;
  const edgeDataSyncedKeys = frozenOptions.edges?.sync?.data
    ? Object.keys(frozenOptions.edges.sync.data)
    : undefined;

  // Used to reconcile state changes with stable object references when the changes
  // are shallowly equal, preventing React Flow from re-rendering unchanged nodes and edges.
  const nodeCache = useRef<Map<string, TNode>>(new Map());
  const edgeCache = useRef<Map<string, TEdge>>(new Map());

  // Local-only state lives in signals.
  const [localNodesΣ] = useState(
    () => new Signal(new Map<string, Partial<LocalNodes>>())
  );
  const [localEdgesΣ] = useState(
    () => new Signal(new Map<string, Partial<LocalEdges>>())
  );
  const [localNodeDataΣ] = useState(
    () => new Signal(new Map<string, Record<string, unknown>>())
  );
  const [localEdgeDataΣ] = useState(
    () => new Signal(new Map<string, Record<string, unknown>>())
  );
  const localNodes = useSignal(localNodesΣ);
  const localEdges = useSignal(localEdgesΣ);
  const localNodeData = useSignal(localNodeDataΣ);
  const localEdgeData = useSignal(localEdgeDataΣ);

  // Remote state lives in Liveblocks Storage.
  const remoteNodesMap = useStorage((root) => {
    const flow = (root as ToImmutable<TStorageRoot>)[frozenOptions.storageKey];
    return (flow?.nodes ?? null) as unknown as ReadonlyMap<
      string,
      TNode
    > | null;
  });
  const remoteEdgesMap = useStorage((root) => {
    const flow = (root as ToImmutable<TStorageRoot>)[frozenOptions.storageKey];
    return (flow?.edges ?? null) as unknown as ReadonlyMap<
      string,
      TEdge
    > | null;
  });

  // Merge remote and local layers to get the final state.
  const nodes = useMemo(
    () =>
      remoteNodesMap
        ? merge(
            nodeCache.current,
            remoteNodesMap,
            localNodes,
            nodeDataSyncedKeys ? localNodeData : undefined
          )
        : null,
    [remoteNodesMap, localNodes, localNodeData, nodeDataSyncedKeys]
  );
  const edges = useMemo(
    () =>
      remoteEdgesMap
        ? merge(
            edgeCache.current,
            remoteEdgesMap,
            localEdges,
            edgeDataSyncedKeys ? localEdgeData : undefined
          )
        : null,
    [remoteEdgesMap, localEdges, localEdgeData, edgeDataSyncedKeys]
  );

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<TNode>[]) => {
      const flow = (storage as TStorageRoot).get(frozenOptions.storageKey);

      if (!flow) {
        return;
      }

      const nextLocal = new Map(localNodesΣ.get());
      const nextLocalData = new Map(localNodeDataΣ.get());
      const hasLocalChanged = applyNodeChanges({
        changes,
        nodes: flow.get("nodes") as LiveMap<string, LiveblocksNode<TNode>>,
        nextLocal,
        nextLocalData: nodeDataSyncedKeys ? nextLocalData : undefined,
        nodeCache: nodeCache.current,
        dataSyncedKeys: nodeDataSyncedKeys,
      });

      if (hasLocalChanged) {
        localNodesΣ.set(nextLocal);
        if (nodeDataSyncedKeys) {
          localNodeDataΣ.set(nextLocalData);
        }
      }
    },
    [nodeDataSyncedKeys]
  );

  const onEdgesChange = useMutation(
    ({ storage }, changes: EdgeChange<TEdge>[]) => {
      const flow = (storage as TStorageRoot).get(frozenOptions.storageKey);

      if (!flow) {
        return;
      }

      const nextLocal = new Map(localEdgesΣ.get());
      const nextLocalData = new Map(localEdgeDataΣ.get());
      const hasLocalChanged = applyEdgeChanges({
        changes,
        edges: flow.get("edges") as LiveMap<string, LiveblocksEdge<TEdge>>,
        nextLocal,
        nextLocalData: edgeDataSyncedKeys ? nextLocalData : undefined,
        edgeCache: edgeCache.current,
        dataSyncedKeys: edgeDataSyncedKeys,
      });

      if (hasLocalChanged) {
        localEdgesΣ.set(nextLocal);
        if (edgeDataSyncedKeys) {
          localEdgeDataΣ.set(nextLocalData);
        }
      }
    },
    [edgeDataSyncedKeys]
  );

  const onConnect = useMutation(({ storage }, connection: Connection) => {
    const flow = (storage as TStorageRoot).get(frozenOptions.storageKey);

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
    const [newEdge] = defaultAddEdge(connection, [] as TEdge[]);

    if (!newEdge) {
      return;
    }

    // Type assertion: edgeToStorage returns the correct shape at runtime;
    // the variance between Pick<data, subset> and Pick<data, all> causes TS errors.
    edges.set(newEdge.id, edgeToStorage(newEdge, edgeDataSyncedKeys) as never);
  }, [edgeDataSyncedKeys]);

  const setInitialStorage = useMutation(({ storage }) => {
    const root = storage as TStorageRoot;

    // Similarly to `initialStorage` on `Client.enterRoom` and `RoomProvider`, we only
    // initialize Storage if it doesn't already exist.
    if (root.get(frozenOptions.storageKey) !== undefined) {
      return;
    }

    const initialNodes = frozenOptions.nodes?.initial ?? [];
    const initialEdges = frozenOptions.edges?.initial ?? [];

    const flow = createLiveblocksFlow(initialNodes, initialEdges, {
      nodeDataSync: frozenOptions.nodes?.sync?.data,
      edgeDataSync: frozenOptions.edges?.sync?.data,
    });
    root.set(frozenOptions.storageKey, flow as Parameters<typeof root.set>[1]);
  }, []);

  useEffect(() => {
    if (isStorageLoaded) {
      setInitialStorage();
    }
  }, [isStorageLoaded, setInitialStorage]);

  // Initialize local node data from initial nodes when sync config is used.
  useEffect(() => {
    if (!nodeDataSyncedKeys || !isStorageLoaded) return;

    const nextLocalData = new Map(localNodeDataΣ.get());
    for (const node of frozenOptions.nodes?.initial ?? []) {
      if (!nextLocalData.has(node.id)) {
        const localData = omit(node.data as object, nodeDataSyncedKeys);
        if (Object.keys(localData).length > 0) {
          nextLocalData.set(node.id, localData as Record<string, unknown>);
        }
      }
    }
    if (nextLocalData.size > 0) {
      localNodeDataΣ.set(nextLocalData);
    }
  }, [
    isStorageLoaded,
    nodeDataSyncedKeys,
    frozenOptions.nodes?.initial,
    localNodeDataΣ,
  ]);

  // Initialize local edge data from initial edges when sync config is used.
  useEffect(() => {
    if (!edgeDataSyncedKeys || !isStorageLoaded) return;

    const nextLocalData = new Map(localEdgeDataΣ.get());
    for (const edge of frozenOptions.edges?.initial ?? []) {
      if (!nextLocalData.has(edge.id) && edge.data) {
        const localData = omit(edge.data as object, edgeDataSyncedKeys);
        if (Object.keys(localData).length > 0) {
          nextLocalData.set(edge.id, localData as Record<string, unknown>);
        }
      }
    }
    if (nextLocalData.size > 0) {
      localEdgeDataΣ.set(nextLocalData);
    }
  }, [
    isStorageLoaded,
    edgeDataSyncedKeys,
    frozenOptions.edges?.initial,
    localEdgeDataΣ,
  ]);

  return {
    nodes,
    edges,
    isLoading: !isStorageLoaded,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } as UseLiveblocksFlowResult<TNode, TEdge>;
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
  TNode extends SerializableNode = SerializableNode,
  TEdge extends SerializableEdge = SerializableEdge,
  const TNodeDataSync extends DataSyncConfig<TNode["data"]> = DataSyncConfig<
    TNode["data"]
  >,
  const TEdgeDataSync extends DataSyncConfig<
    NonNullable<TEdge["data"]>
  > = DataSyncConfig<NonNullable<TEdge["data"]>>,
>(
  options: UseLiveblocksFlowOptions<
    TNode,
    TEdge,
    TNodeDataSync,
    TEdgeDataSync
  > = {}
): Resolve<LiveblocksFlowSuspenseResult<TNode, TEdge>> {
  const result = useLiveblocksFlow<TNode, TEdge, TNodeDataSync, TEdgeDataSync>(
    options
  );

  useSuspendUntilStorageReady();

  return {
    ...result,
    nodes: result.nodes ?? (EMPTY_ARRAY as TNode[]),
    edges: result.edges ?? (EMPTY_ARRAY as TEdge[]),
    isLoading: false,
  };
}
