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
import { useSignal } from "@liveblocks/react/_private";
import {
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useMemo, useRef } from "react";

import { omit, pick, type UnwrapLiveObject } from "./utils";

const NODE_LOCAL_KEYS = [
  "selected",
  "dragging",
  "measured",
  "resizing",
] satisfies (keyof Node)[number][];
const EDGE_LOCAL_KEYS = ["selected"] satisfies (keyof Edge)[number][];
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
>() {
  type TStorageRoot = LiveblocksFlowRoot<NodeData, EdgeData>;
  type TNode = Node<NodeData>;
  type TEdge = Edge<EdgeData>;

  const nodeCache = useRef<Map<string, TNode>>(new Map());
  const edgeCache = useRef<Map<string, TEdge>>(new Map());

  const nodeLocalΣ = useMemo(
    () => new Signal(new Map<string, Partial<LocalNodes>>()),
    []
  );
  const edgeLocalΣ = useMemo(
    () => new Signal(new Map<string, Partial<LocalEdges>>()),
    []
  );
  const nodeLocal = useSignal(nodeLocalΣ);
  const edgeLocal = useSignal(edgeLocalΣ);

  const remoteNodes =
    useStorage((root) => {
      const nodes = (root as ToImmutable<TStorageRoot> | null)?.flow?.nodes;
      if (!nodes) return EMPTY as unknown as TNode[];
      return [...nodes.values()] as unknown as TNode[];
    }) ?? (EMPTY as unknown as TNode[]);

  const remoteEdges =
    useStorage((root) => {
      const edges = (root as ToImmutable<TStorageRoot> | null)?.flow?.edges;
      if (!edges) return EMPTY as unknown as TEdge[];
      return [...edges.values()] as unknown as TEdge[];
    }) ?? (EMPTY as unknown as TEdge[]);

  const nodes = useMemo(() => {
    return remoteNodes.map((node) => {
      const local = nodeLocal.get(node.id);
      const merged = local ? { ...node, ...local } : node;

      return reconcile(merged, nodeCache.current);
    });
  }, [remoteNodes, nodeLocal]);

  const edges = useMemo(() => {
    return remoteEdges.map((edge) => {
      const local = edgeLocal.get(edge.id);
      const merged = local ? { ...edge, ...local } : edge;

      return reconcile(merged, edgeCache.current);
    });
  }, [remoteEdges, edgeLocal]);

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<TNode>[]) => {
      const root = storage as TStorageRoot;
      const nodes = root.get("flow").get("nodes");

      let localChanged = false;
      const nextLocal = new Map(nodeLocalΣ.get());

      const upsertLocal = (node: TNode) => {
        const localState = pick(node, NODE_LOCAL_KEYS);

        if (Object.keys(localState).length > 0) {
          nextLocal.set(node.id, localState);
        } else {
          nextLocal.delete(node.id);
        }

        localChanged = true;
      };

      for (const change of changes) {
        switch (change.type) {
          case "add":
          case "replace":
            nodes.set(change.item.id, nodeToStorage(change.item));
            upsertLocal(change.item);
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
              nextLocal.set(change.id, {
                ...nextLocal.get(change.id),
                dragging: change.dragging,
              });
              localChanged = true;
            }

            break;
          }

          case "dimensions": {
            const existing = nextLocal.get(change.id);
            const patch: Partial<LocalNodes> = { ...existing };

            if (change.dimensions !== undefined) {
              patch.measured = change.dimensions;
            }

            if (change.resizing !== undefined) {
              patch.resizing = change.resizing;
            }

            if (patch !== existing) {
              nextLocal.set(change.id, patch);
              localChanged = true;
            }

            break;
          }

          case "select":
            nextLocal.set(change.id, {
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
        nodeLocalΣ.set(nextLocal);
      }
    },
    []
  );

  const onEdgesChange = useMutation(
    ({ storage }, changes: EdgeChange<TEdge>[]) => {
      const root = storage as TStorageRoot;
      const edges = root.get("flow").get("edges");

      let localChanged = false;
      const nextLocal = new Map(edgeLocalΣ.get());

      const upsertLocal = (edge: TEdge) => {
        const localState = pick(edge, EDGE_LOCAL_KEYS);

        if (Object.keys(localState).length > 0) {
          nextLocal.set(edge.id, localState);
        } else {
          nextLocal.delete(edge.id);
        }

        localChanged = true;
      };

      for (const change of changes) {
        switch (change.type) {
          case "add":
          case "replace":
            edges.set(change.item.id, edgeToStorage(change.item));
            upsertLocal(change.item);
            break;

          case "remove":
            edges.delete(change.id);
            edgeCache.current.delete(change.id);
            nextLocal.delete(change.id);
            localChanged = true;
            break;

          case "select":
            nextLocal.set(change.id, {
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
        edgeLocalΣ.set(nextLocal);
      }
    },
    []
  );

  const onConnect = useMutation(({ storage }, connection: Connection) => {
    const root = storage as TStorageRoot;
    const edges = root.get("flow").get("edges");

    const current = Array.from(
      edges.values(),
      (edge) => edge.toObject() as unknown as TEdge
    );

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
    onNodesChange,
    onEdgesChange,
    onConnect,
  };
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
