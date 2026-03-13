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
  useLatest,
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

import { omit, pick } from "./utils";

const NODE_LOCAL_KEYS = [
  "selected",
  "dragging",
  "measured",
  "resizing",
] as const satisfies (keyof Node)[number][];
const EDGE_LOCAL_KEYS = ["selected"] as const satisfies (keyof Edge)[number][];
const EMPTY: [] = [];

export type LiveblocksNode<NodeData extends JsonObject = JsonObject> =
  LiveObject<
    Omit<Node<NodeData>, (typeof NODE_LOCAL_KEYS)[number]> & LsonObject
  >;

export type LiveblocksEdge<EdgeData extends JsonObject = JsonObject> =
  LiveObject<
    Omit<Edge<EdgeData>, (typeof EDGE_LOCAL_KEYS)[number]> & LsonObject
  >;

export type LiveblocksFlow<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<NodeData>>;
  edges: LiveMap<string, LiveblocksEdge<EdgeData>>;
}>;

export type LiveblocksFlowRoot<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
  StorageRoot extends LsonObject = LsonObject,
> = LiveObject<
  StorageRoot & {
    flow: LiveblocksFlow<NodeData, EdgeData>;
  }
>;

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
    addNode: (node: Node<NodeData>) => void;
    removeNode: (id: string) => void;
    updateNode: (
      id: string,
      update:
        | Partial<Node<NodeData>>
        | ((node: Node<NodeData>) => Node<NodeData> | Partial<Node<NodeData>>)
    ) => void;
    addEdge: (edge: Edge<EdgeData>) => void;
    removeEdge: (id: string) => void;
    updateEdge: (
      id: string,
      update:
        | Partial<Edge<EdgeData>>
        | ((edge: Edge<EdgeData>) => Edge<EdgeData> | Partial<Edge<EdgeData>>)
    ) => void;
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
  initial?: {
    nodes?: Node<NodeData>[];
    edges?: Edge<EdgeData>[];
  };
};

function nodeToStorage<NodeData extends JsonObject>(
  node: Node<NodeData>
): LiveblocksNode<NodeData> {
  return new LiveObject(
    omit(node, NODE_LOCAL_KEYS) as unknown as LsonObject
  ) as LiveblocksNode<NodeData>;
}

function edgeToStorage<EdgeData extends JsonObject>(
  edge: Edge<EdgeData>
): LiveblocksEdge<EdgeData> {
  return new LiveObject(
    omit(edge, EDGE_LOCAL_KEYS) as unknown as LsonObject
  ) as LiveblocksEdge<EdgeData>;
}

function setOrDelete<T extends object>(
  map: Map<string, T>,
  id: string,
  entries: T
): void {
  const next: Record<string, unknown> = {};

  for (const key in entries) {
    const value = (entries as Record<string, unknown>)[key];

    if (value) {
      next[key] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    map.set(id, next as T);
  } else {
    map.delete(id);
  }
}

function reconcile<T extends { id: string }>(next: T, cache: Map<string, T>) {
  const previous = cache.get(next.id);

  if (previous && shallow(previous, next)) {
    return previous;
  }

  cache.set(next.id, next);

  return next;
}

export function useLiveblocksFlow<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>(
  options: UseLiveblocksFlowOptions<NodeData, EdgeData> = {}
): Resolve<UseLiveblocksFlowResult<NodeData, EdgeData>> {
  type TStorageRoot = LiveblocksFlowRoot<NodeData, EdgeData>;
  type TNode = Node<NodeData>;
  type TEdge = Edge<EdgeData>;

  const EMPTY_NODES = EMPTY as TNode[];
  const EMPTY_EDGES = EMPTY as TEdge[];

  const latestInitial = useLatest(options.initial);

  const nodeCache = useRef<Map<string, TNode>>(new Map());
  const edgeCache = useRef<Map<string, TEdge>>(new Map());

  const [localNodesΣ] = useState(
    () => new Signal(new Map<string, Partial<LocalNodes>>())
  );
  const [localEdgesΣ] = useState(
    () => new Signal(new Map<string, Partial<LocalEdges>>())
  );
  const localNodes = useSignal(localNodesΣ);
  const localEdges = useSignal(localEdgesΣ);

  const remoteNodes = useStorage((root) => {
    const nodes = (root as ToImmutable<TStorageRoot> | null)?.flow?.nodes;

    if (!nodes) {
      return EMPTY_NODES;
    }

    return [...nodes.values()];
  });
  const remoteEdges = useStorage((root) => {
    const edges = (root as ToImmutable<TStorageRoot> | null)?.flow?.edges;

    if (!edges) {
      return EMPTY_EDGES;
    }

    return [...edges.values()];
  });

  const nodes = useMemo(() => {
    if (remoteNodes === null) {
      return null;
    }

    return remoteNodes.map((node) => {
      const local = localNodes.get(node.id);
      const merged = local ? { ...node, ...local } : node;

      return reconcile(merged, nodeCache.current);
    });
  }, [remoteNodes, localNodes]);
  const edges = useMemo(() => {
    if (remoteEdges === null) {
      return null;
    }

    return remoteEdges.map((edge) => {
      const local = localEdges.get(edge.id);
      const merged = local ? { ...edge, ...local } : edge;

      return reconcile(merged, edgeCache.current);
    });
  }, [remoteEdges, localEdges]);

  const isLoading = remoteNodes === null || remoteEdges === null;

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<TNode>[]) => {
      const root = storage as TStorageRoot;
      const nodes = root.get("flow").get("nodes");

      let localChanged = false;
      const nextLocal = new Map(localNodesΣ.get());

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
            localChanged = true;
            break;

          case "remove":
            nodes.delete(change.id);
            nodeCache.current.delete(change.id);
            nextLocal.delete(change.id);
            localChanged = true;
            break;

          case "position": {
            const node = nodes.get(change.id);

            if (!node || !change.position) {
              break;
            }

            const previous = node.get("position") as
              | TNode["position"]
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
              localChanged = true;
            }

            break;
          }

          case "dimensions": {
            const patch: Partial<LocalNodes> = {
              ...nextLocal.get(change.id),
            };

            if (change.dimensions !== undefined) {
              patch.measured = change.dimensions;
            }

            if (change.resizing !== undefined) {
              patch.resizing = change.resizing;
            }

            setOrDelete(nextLocal, change.id, patch);
            localChanged = true;
            break;
          }

          case "select":
            setOrDelete(nextLocal, change.id, {
              ...nextLocal.get(change.id),
              selected: change.selected,
            });
            localChanged = true;
            break;

          default:
            break;
        }
      }

      if (localChanged) {
        localNodesΣ.set(nextLocal);
      }
    },
    []
  );

  const onEdgesChange = useMutation(
    ({ storage }, changes: EdgeChange<TEdge>[]) => {
      const root = storage as TStorageRoot;
      const edges = root.get("flow").get("edges");

      let localChanged = false;
      const nextLocal = new Map(localEdgesΣ.get());

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
            localChanged = true;
            break;

          case "remove":
            edges.delete(change.id);
            edgeCache.current.delete(change.id);
            nextLocal.delete(change.id);
            localChanged = true;
            break;

          case "select":
            setOrDelete(nextLocal, change.id, {
              ...nextLocal.get(change.id),
              selected: change.selected,
            });
            localChanged = true;
            break;

          default:
            break;
        }
      }

      if (localChanged) {
        localEdgesΣ.set(nextLocal);
      }
    },
    []
  );

  const onConnect = useMutation(({ storage }, connection: Connection) => {
    const root = storage as TStorageRoot;
    const edges = root.get("flow").get("edges");

    const current = Array.from(edges.values(), (edge) => edge.toObject());
    const next = defaultAddEdge(connection, current);
    const edge = next[next.length - 1];

    if (!edge) {
      return;
    }

    edges.set(edge.id, edgeToStorage(edge));
  }, []);

  const addNode = useMutation(({ storage }, node: TNode) => {
    const root = storage as TStorageRoot;
    const nodes = root.get("flow").get("nodes");

    nodes.set(node.id, nodeToStorage(node));

    const nextLocal = new Map(localNodesΣ.get());
    setOrDelete(nextLocal, node.id, pick(node, NODE_LOCAL_KEYS));
    localNodesΣ.set(nextLocal);
  }, []);

  const removeNode = useMutation(({ storage }, id: string) => {
    const root = storage as TStorageRoot;
    const nodes = root.get("flow").get("nodes");

    nodes.delete(id);
    nodeCache.current.delete(id);

    const nextLocal = new Map(localNodesΣ.get());
    nextLocal.delete(id);
    localNodesΣ.set(nextLocal);
  }, []);

  const updateNode = useMutation(
    (
      { storage },
      id: string,
      update: Partial<TNode> | ((node: TNode) => TNode | Partial<TNode>)
    ) => {
      const root = storage as TStorageRoot;
      const nodes = root.get("flow").get("nodes");
      const storedNode = nodes.get(id);

      if (!storedNode) {
        return;
      }

      const stored = storedNode.toObject() as unknown as Omit<
        TNode,
        (typeof NODE_LOCAL_KEYS)[number]
      >;
      const local = localNodesΣ.get().get(id);
      const current = { ...stored, ...local } as TNode;
      const patch = typeof update === "function" ? update(current) : update;
      const updated = { ...current, ...patch } as TNode;

      nodes.set(id, nodeToStorage(updated));

      const nextLocal = new Map(localNodesΣ.get());
      setOrDelete(nextLocal, id, pick(updated, NODE_LOCAL_KEYS));
      localNodesΣ.set(nextLocal);
    },
    []
  );

  const addEdge = useMutation(({ storage }, edge: TEdge) => {
    const root = storage as TStorageRoot;
    const edges = root.get("flow").get("edges");

    edges.set(edge.id, edgeToStorage(edge));

    const nextLocal = new Map(localEdgesΣ.get());
    setOrDelete(nextLocal, edge.id, pick(edge, EDGE_LOCAL_KEYS));
    localEdgesΣ.set(nextLocal);
  }, []);

  const removeEdge = useMutation(({ storage }, id: string) => {
    const root = storage as TStorageRoot;
    const edges = root.get("flow").get("edges");

    edges.delete(id);
    edgeCache.current.delete(id);

    const nextLocal = new Map(localEdgesΣ.get());
    nextLocal.delete(id);
    localEdgesΣ.set(nextLocal);
  }, []);

  const updateEdge = useMutation(
    (
      { storage },
      id: string,
      update: Partial<TEdge> | ((edge: TEdge) => TEdge | Partial<TEdge>)
    ) => {
      const root = storage as TStorageRoot;
      const edges = root.get("flow").get("edges");
      const storedEdge = edges.get(id);

      if (!storedEdge) {
        return;
      }

      const stored = storedEdge.toObject() as unknown as Omit<
        TEdge,
        (typeof EDGE_LOCAL_KEYS)[number]
      >;
      const local = localEdgesΣ.get().get(id);
      const current = { ...stored, ...local } as TEdge;
      const patch = typeof update === "function" ? update(current) : update;
      const updated = { ...current, ...patch } as TEdge;

      edges.set(id, edgeToStorage(updated));

      const nextLocal = new Map(localEdgesΣ.get());
      setOrDelete(nextLocal, id, pick(updated, EDGE_LOCAL_KEYS));
      localEdgesΣ.set(nextLocal);
    },
    []
  );

  const setInitialStorage = useMutation(({ storage }) => {
    const root = storage as TStorageRoot;

    if (root.get("flow") !== undefined) {
      return;
    }

    const { nodes: initialNodes = [], edges: initialEdges = [] } =
      latestInitial.current ?? {};

    root.set(
      "flow",
      new LiveObject({
        nodes: new LiveMap(
          initialNodes.map((node) => [node.id, nodeToStorage(node)])
        ),
        edges: new LiveMap(
          initialEdges.map((edge) => [edge.id, edgeToStorage(edge)])
        ),
      }) as LiveblocksFlow<NodeData, EdgeData>
    );
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setInitialStorage();
    }
  }, [isLoading, setInitialStorage]);

  return {
    nodes,
    edges,
    isLoading,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    updateEdge,
  } as UseLiveblocksFlowResult<NodeData, EdgeData>;
}

export function useLiveblocksFlowSuspense<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>(
  options: UseLiveblocksFlowOptions<NodeData, EdgeData> = {}
): Resolve<LiveblocksFlowSuspenseResult<NodeData, EdgeData>> {
  useSuspendUntilStorageReady();

  return useLiveblocksFlow<NodeData, EdgeData>(
    options
  ) as LiveblocksFlowSuspenseResult<NodeData, EdgeData>;
}
