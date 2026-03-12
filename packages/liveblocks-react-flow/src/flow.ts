import {
  type JsonObject,
  LiveMap,
  LiveObject,
  type LsonObject,
  type Resolve,
  shallow,
  type ToImmutable,
} from "@liveblocks/core";
import { useMutation, useStorage } from "@liveblocks/react";
import {
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useRef } from "react";

import { omit, pick, type UnwrapLiveObject } from "./utils";

const NODE_LOCAL_KEYS = [
  "selected",
  "dragging",
  "measured",
  "resizing",
  "domAttributes",
] satisfies (keyof Node)[number][];

const EDGE_LOCAL_KEYS = [
  "selected",
  "domAttributes",
] satisfies (keyof Edge)[number][];

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

type NodeLocalState = Partial<
  Record<(typeof NODE_LOCAL_KEYS)[number], unknown>
>;
type EdgeLocalState = Partial<
  Record<(typeof EDGE_LOCAL_KEYS)[number], unknown>
>;

function getNodeLocalState<NodeData extends JsonObject>(
  node: Node<NodeData>
): Partial<NodeLocalState> {
  return pick(node, NODE_LOCAL_KEYS);
}

function getEdgeLocalState<EdgeData extends JsonObject>(
  edge: Edge<EdgeData>
): Partial<EdgeLocalState> {
  return pick(edge, EDGE_LOCAL_KEYS);
}

function hasOwnEntries(value: object): boolean {
  for (const _key in value) {
    return true;
  }
  return false;
}

function updateLocalState<T extends object>(
  cache: Map<string, T>,
  id: string,
  next: T,
  mode: "replace" | "patch"
) {
  if (mode === "replace") {
    if (hasOwnEntries(next)) {
      cache.set(id, next);
    } else {
      cache.delete(id);
    }
    return;
  }

  if (!hasOwnEntries(next)) {
    return;
  }

  const previous = cache.get(id);
  const merged = { ...previous, ...next };

  if (previous && shallow(previous, merged)) {
    return;
  }

  if (hasOwnEntries(merged)) {
    cache.set(id, merged);
  } else {
    cache.delete(id);
  }
}

function mergeLocalState<T extends { id: string }, L extends object>(
  value: T,
  cache: Map<string, L>
): T {
  const local = cache.get(value.id);

  if (!local) {
    return value;
  }

  return {
    ...value,
    ...local,
  };
}

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
  const nodeLocalStateCache = useRef<Map<string, Partial<NodeLocalState>>>(
    new Map()
  );
  const edgeLocalStateCache = useRef<Map<string, Partial<EdgeLocalState>>>(
    new Map()
  );

  const nodes =
    useStorage((root) => {
      const flow = (root as ToImmutable<TStorageRoot> | null)?.flow;
      const nodes = flow?.nodes;

      if (!nodes) {
        return [];
      }

      const result: TNode[] = [];

      for (const node of nodes.values()) {
        const merged = mergeLocalState(
          node as unknown as TNode,
          nodeLocalStateCache.current
        );

        result.push(reconcile(merged, nodeCache.current));
      }

      return result;
    }) ?? [];

  const edges =
    useStorage((root) => {
      const flow = (root as ToImmutable<TStorageRoot> | null)?.flow;
      const edges = flow?.edges;

      if (!edges) {
        return [];
      }

      const result: TEdge[] = [];

      for (const edge of edges.values()) {
        const merged = mergeLocalState(
          edge as unknown as TEdge,
          edgeLocalStateCache.current
        );

        result.push(reconcile(merged, edgeCache.current));
      }

      return result;
    }) ?? [];

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<TNode>[]) => {
      const root = storage as TStorageRoot;
      const nodes = root.get("flow").get("nodes");

      const upsertNode = (node: TNode) => {
        nodes.set(node.id, nodeToStorage(node));
        updateLocalState(
          nodeLocalStateCache.current,
          node.id,
          getNodeLocalState(node),
          "replace"
        );
      };

      for (const change of changes) {
        switch (change.type) {
          case "add":
            upsertNode(change.item);
            break;

          case "remove":
            nodes.delete(change.id);
            nodeCache.current.delete(change.id);
            nodeLocalStateCache.current.delete(change.id);
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
              updateLocalState(
                nodeLocalStateCache.current,
                change.id,
                {
                  dragging: change.dragging,
                },
                "patch"
              );
            }

            break;
          }

          case "dimensions": {
            const patch: Partial<NodeLocalState> = {};

            if (change.dimensions !== undefined) {
              patch.measured = change.dimensions;
            }

            if (change.resizing !== undefined) {
              patch.resizing = change.resizing;
            }

            updateLocalState(
              nodeLocalStateCache.current,
              change.id,
              patch,
              "patch"
            );
            break;
          }

          case "select":
            updateLocalState(
              nodeLocalStateCache.current,
              change.id,
              {
                selected: change.selected,
              },
              "patch"
            );
            break;

          case "replace":
            upsertNode(change.item);
            break;

          default:
            break;
        }
      }
    },
    []
  );

  const onEdgesChange = useMutation(
    ({ storage }, changes: EdgeChange<TEdge>[]) => {
      const root = storage as TStorageRoot;
      const edges = root.get("flow").get("edges");

      const upsertEdge = (edge: TEdge) => {
        edges.set(edge.id, edgeToStorage(edge));
        updateLocalState(
          edgeLocalStateCache.current,
          edge.id,
          getEdgeLocalState(edge),
          "replace"
        );
      };

      for (const change of changes) {
        switch (change.type) {
          case "add":
            upsertEdge(change.item);
            break;

          case "remove":
            edges.delete(change.id);
            edgeCache.current.delete(change.id);
            edgeLocalStateCache.current.delete(change.id);
            break;

          case "select":
            updateLocalState(
              edgeLocalStateCache.current,
              change.id,
              {
                selected: change.selected,
              },
              "patch"
            );
            break;

          case "replace":
            upsertEdge(change.item);
            break;

          default:
            break;
        }
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
