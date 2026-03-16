import {
  type JsonObject,
  LiveMap,
  LiveObject,
  type LsonObject,
  type Resolve,
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

import { omit, pick, reconcile, setOrDelete } from "./utils";

const EMPTY_ARRAY = [] as unknown[];

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

/**
 * The Liveblocks Storage representation of a React Flow `Node`.
 *
 * It doesn't include local-only properties and is stored as a `LiveObject`.
 */
export type LiveblocksNode<NodeData extends JsonObject = JsonObject> =
  LiveObject<
    Omit<Node<NodeData>, (typeof NODE_LOCAL_KEYS)[number]> & LsonObject
  >;

/**
 * The Liveblocks Storage representation of a React Flow `Edge`.
 *
 * It doesn't include local-only properties and is stored as a `LiveObject`.
 */
export type LiveblocksEdge<EdgeData extends JsonObject = JsonObject> =
  LiveObject<
    Omit<Edge<EdgeData>, (typeof EDGE_LOCAL_KEYS)[number]> & LsonObject
  >;

/**
 * The Liveblocks Storage representation of a React Flow diagram made of nodes and edges.
 *
 * Nodes and edges are stored as `LiveMap`s keyed by their IDs, enabling
 * fine-grained conflict-free updates from multiple clients simultaneously.
 */
export type LiveblocksFlow<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<NodeData>>;
  edges: LiveMap<string, LiveblocksEdge<EdgeData>>;
}>;

type LocalNodes = Partial<Record<(typeof NODE_LOCAL_KEYS)[number], unknown>>;
type LocalEdges = Partial<Record<(typeof EDGE_LOCAL_KEYS)[number], unknown>>;

type UseLiveblocksFlowResult<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
> = Resolve<
  (
    | {
        nodes: null;
        edges: null;
        isLoading: true;
      }
    | {
        nodes: Node<NodeData>[];
        edges: Edge<EdgeData>[];
        isLoading: false;
      }
  ) & {
    onNodesChange: OnNodesChange<Node<NodeData>>;
    onEdgesChange: OnEdgesChange<Edge<EdgeData>>;
    onConnect: OnConnect;
  }
>;

type LiveblocksFlowSuspenseResult<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
> = Extract<UseLiveblocksFlowResult<NodeData, EdgeData>, { isLoading: false }>;

type UseLiveblocksFlowOptions<
  NodeData extends JsonObject,
  EdgeData extends JsonObject,
> = {
  /**
   * The initial React Flow nodes and edges.
   *
   * @example
   * ```tsx
   * const { ... } = useLiveblocksFlow({
   *   initial: {
   *     nodes: [
   *       { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
   *       { id: "2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
   *     ],
   *     edges: [
   *       { id: "1-2", source: "1", target: "2" },
   *     ],
   *   },
   * });
   * ```
   *
   * This is equivalent to setting `initialStorage` on `RoomProvider`.
   *
   * @example
   * ```tsx
   * <RoomProvider
   *   initialStorage={{
   *     flow: createLiveblocksFlow([
   *       { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
   *       { id: "2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
   *     ], [
   *       { id: "1-2", source: "1", target: "2" },
   *     ]),
   *   }}
   * />
   * ```
   */
  initial?: {
    nodes?: Node<NodeData>[];
    edges?: Edge<EdgeData>[];
  };

  /**
   * The key used to store the React Flow diagram in Liveblocks Storage.
   *
   * Defaults to `"flow"`.
   *
   * @example
   * ```tsx
   * const { ... } = useLiveblocksFlow({
   *   storageKey: "myDiagram",
   * });
   * ```
   */
  storageKey?: string;
};

// Converts a React Flow `Node` into a Liveblocks Storage version, omitting
// the fields that must stay local to each client.
function nodeToStorage<NodeData extends JsonObject>(
  node: Node<NodeData>
): LiveblocksNode<NodeData> {
  return new LiveObject(
    omit(node, NODE_LOCAL_KEYS) as unknown as LsonObject
  ) as LiveblocksNode<NodeData>;
}

// Converts a React Flow `Edge` into a Liveblocks Storage version, omitting
// the fields that must stay local to each client.
function edgeToStorage<EdgeData extends JsonObject>(
  edge: Edge<EdgeData>
): LiveblocksEdge<EdgeData> {
  return new LiveObject(
    omit(edge, EDGE_LOCAL_KEYS) as unknown as LsonObject
  ) as LiveblocksEdge<EdgeData>;
}

// Similar to React Flow's `applyNodeChanges()`, but with a split between local
// and remote changes.
// https://reactflow.dev/api-reference/utils/apply-node-changes
function applyNodeChanges<NodeData extends JsonObject>(args: {
  changes: NodeChange<Node<NodeData>>[];
  nodes: LiveMap<string, LiveblocksNode<NodeData>>;
  nextLocal: Map<string, Partial<LocalNodes>>;
  nodeCache: Map<string, Node<NodeData>>;
}): boolean {
  const { changes, nodes, nextLocal, nodeCache } = args;

  let hasLocalChanged = false;

  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "replace":
        nodes.set(change.item.id, nodeToStorage(change.item));
        setOrDelete(
          nextLocal,
          change.item.id,
          pick(change.item, NODE_LOCAL_KEYS)
        );
        hasLocalChanged = true;
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

        const previous = node.get("position") as
          | Node<NodeData>["position"]
          | undefined;

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
function applyEdgeChanges<EdgeData extends JsonObject>(args: {
  changes: EdgeChange<Edge<EdgeData>>[];
  edges: LiveMap<string, LiveblocksEdge<EdgeData>>;
  nextLocal: Map<string, Partial<LocalEdges>>;
  edgeCache: Map<string, Edge<EdgeData>>;
}): boolean {
  const { changes, edges, nextLocal, edgeCache } = args;

  let hasLocalChanged = false;

  for (const change of changes) {
    switch (change.type) {
      case "add":
      case "replace":
        edges.set(change.item.id, edgeToStorage(change.item));
        setOrDelete(
          nextLocal,
          change.item.id,
          pick(change.item, EDGE_LOCAL_KEYS)
        );
        hasLocalChanged = true;
        break;

      case "remove":
        edges.delete(change.id);
        edgeCache.delete(change.id);
        nextLocal.delete(change.id);
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
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>(
  nodes: Node<NodeData>[] = [],
  edges: Edge<EdgeData>[] = []
): LiveblocksFlow<NodeData, EdgeData> {
  return new LiveObject({
    nodes: new LiveMap(nodes.map((node) => [node.id, nodeToStorage(node)])),
    edges: new LiveMap(edges.map((edge) => [edge.id, edgeToStorage(edge)])),
  }) as LiveblocksFlow<NodeData, EdgeData>;
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
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>(
  options: UseLiveblocksFlowOptions<NodeData, EdgeData> = {}
): Resolve<UseLiveblocksFlowResult<NodeData, EdgeData>> {
  type TStorageRoot = LiveObject<{
    [key: string]: LiveblocksFlow<NodeData, EdgeData> | undefined;
  }>;
  type TNode = Node<NodeData>;
  type TEdge = Edge<EdgeData>;

  const isStorageLoaded = useStorage(() => true) ?? false;

  // These options are not reactive, only their initial values are used.
  const frozenOptions = useInitial({
    initial: options.initial,
    storageKey: options.storageKey ?? "flow",
  });

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
  const localNodes = useSignal(localNodesΣ);
  const localEdges = useSignal(localEdgesΣ);

  // Remote state lives in Liveblocks Storage.
  const remoteNodes = useStorage((root) => {
    const flow = (root as ToImmutable<TStorageRoot>)[frozenOptions.storageKey];
    return flow ? ([...flow.nodes.values()] as TNode[]) : null;
  });
  const remoteEdges = useStorage((root) => {
    const flow = (root as ToImmutable<TStorageRoot>)[frozenOptions.storageKey];
    return flow ? ([...flow.edges.values()] as TEdge[]) : null;
  });

  // Merge remote and local layers to get the final state.
  const nodes = useMemo(() => {
    if (remoteNodes === null) {
      return null;
    }

    return remoteNodes.map((node) => {
      const local = localNodes.get(node.id);
      const merged = local ? { ...node, ...local } : node;

      return reconcile(nodeCache.current, merged, node.id);
    });
  }, [remoteNodes, localNodes]);
  const edges = useMemo(() => {
    if (remoteEdges === null) {
      return null;
    }

    return remoteEdges.map((edge) => {
      const local = localEdges.get(edge.id);
      const merged = local ? { ...edge, ...local } : edge;

      return reconcile(edgeCache.current, merged, edge.id);
    });
  }, [remoteEdges, localEdges]);

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<TNode>[]) => {
      const flow = (storage as TStorageRoot).get(frozenOptions.storageKey);

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
    },
    []
  );

  const onEdgesChange = useMutation(
    ({ storage }, changes: EdgeChange<TEdge>[]) => {
      const flow = (storage as TStorageRoot).get(frozenOptions.storageKey);

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
    },
    []
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

    edges.set(newEdge.id, edgeToStorage(newEdge));
  }, []);

  const setInitialStorage = useMutation(({ storage }) => {
    const root = storage as TStorageRoot;

    // Similarly to `initialStorage` on `Client.enterRoom` and `RoomProvider`, we only
    // initialize Storage if it doesn't already exist.
    if (root.get(frozenOptions.storageKey) !== undefined) {
      return;
    }

    const { nodes: initialNodes = [], edges: initialEdges = [] } =
      frozenOptions.initial ?? {};

    root.set(
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
  } as UseLiveblocksFlowResult<NodeData, EdgeData>;
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
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>(
  options: UseLiveblocksFlowOptions<NodeData, EdgeData> = {}
): Resolve<LiveblocksFlowSuspenseResult<NodeData, EdgeData>> {
  const result = useLiveblocksFlow<NodeData, EdgeData>(options);

  useSuspendUntilStorageReady();

  return {
    ...result,
    nodes: result.nodes ?? (EMPTY_ARRAY as Node<NodeData>[]),
    edges: result.edges ?? (EMPTY_ARRAY as Edge<EdgeData>[]),
    isLoading: false,
  };
}
