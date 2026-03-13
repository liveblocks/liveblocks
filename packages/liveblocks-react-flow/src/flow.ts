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
  useSignal,
  useSuspendUntilStorageReady,
} from "@liveblocks/react/_private";
import {
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { useMemo, useRef, useState } from "react";

import { omit, pick, type UnwrapLiveObject } from "./utils";

const NODE_LOCAL_KEYS = [
  "selected",
  "dragging",
  "measured",
  "resizing",
] as const satisfies (keyof Node)[number][];
const EDGE_LOCAL_KEYS = ["selected"] as const satisfies (keyof Edge)[number][];
const EMPTY: [] = [];

export type UseLiveblocksFlowResult<
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
>(): Resolve<UseLiveblocksFlowResult<NodeData, EdgeData>> {
  type TStorageRoot = LiveblocksFlowRoot<NodeData, EdgeData>;
  type TNode = Node<NodeData>;
  type TEdge = Edge<EdgeData>;

  const EMPTY_NODES = EMPTY as TNode[];
  const EMPTY_EDGES = EMPTY as TEdge[];

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
    const next = addEdge(connection, current);
    const edge = next[next.length - 1];

    if (!edge) {
      return;
    }

    edges.set(edge.id, edgeToStorage(edge));
  }, []);

  return {
    nodes,
    edges,
    isLoading: remoteNodes === null || remoteEdges === null,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } as UseLiveblocksFlowResult<NodeData, EdgeData>;
}

export function useLiveblocksFlowSuspense<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>(): Resolve<LiveblocksFlowSuspenseResult<NodeData, EdgeData>> {
  useSuspendUntilStorageReady();

  const result = useLiveblocksFlow<NodeData, EdgeData>();

  return result as LiveblocksFlowSuspenseResult<NodeData, EdgeData>;
}

export function createLiveblocksFlowInitialStorage<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>({
  nodes = [],
  edges = [],
}: {
  nodes?: Node<NodeData>[];
  edges?: Edge<EdgeData>[];
} = {}): Resolve<UnwrapLiveObject<LiveblocksFlowRoot<NodeData, EdgeData>>> {
  return {
    flow: new LiveObject({
      nodes: new LiveMap(nodes.map((node) => [node.id, nodeToStorage(node)])),
      edges: new LiveMap(edges.map((edge) => [edge.id, edgeToStorage(edge)])),
    }),
  };
}
