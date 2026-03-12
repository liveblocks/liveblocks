import {
  type JsonObject,
  LiveMap,
  LiveObject,
  type LsonObject,
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

type LiveblocksNode<_NodeData extends JsonObject = JsonObject> =
  LiveObject<LsonObject>;

type LiveblocksEdge<_EdgeData extends JsonObject = JsonObject> =
  LiveObject<LsonObject>;

type LiveblocksFlow<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
> = LiveObject<{
  nodes: LiveMap<string, LiveblocksNode<NodeData>>;
  edges: LiveMap<string, LiveblocksEdge<EdgeData>>;
}>;

type StorageRoot<
  NodeData extends JsonObject,
  EdgeData extends JsonObject,
> = LiveObject<{
  flow: LiveblocksFlow<NodeData, EdgeData>;
}>;

type NodeLocalState = Partial<
  Record<(typeof NODE_LOCAL_KEYS)[number], unknown>
>;
type EdgeLocalState = Partial<
  Record<(typeof EDGE_LOCAL_KEYS)[number], unknown>
>;

type ImmutableStorageRoot<
  NodeData extends JsonObject,
  EdgeData extends JsonObject,
> = ToImmutable<StorageRoot<NodeData, EdgeData>>;

function getFlow<NodeData extends JsonObject, EdgeData extends JsonObject>(
  storage: StorageRoot<NodeData, EdgeData>
) {
  return storage.get("flow");
}

function omitKeys<T extends object, K extends PropertyKey>(
  source: T,
  keys: readonly K[]
): Omit<T, Extract<K, keyof T>> {
  const result = { ...source } as Partial<T>;

  for (const key of keys) {
    delete (result as Record<PropertyKey, unknown>)[key];
  }

  return result as Omit<T, Extract<K, keyof T>>;
}

function pickDefined<T extends object, K extends PropertyKey>(
  source: T,
  keys: readonly K[]
): Partial<Record<K, unknown>> {
  const result: Partial<Record<K, unknown>> = {};
  const sourceObject = source as Record<PropertyKey, unknown>;

  for (const key of keys) {
    const value = sourceObject[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

function getNodeLocalState<NodeData extends JsonObject>(
  node: Node<NodeData>
): Partial<NodeLocalState> {
  return pickDefined(node, NODE_LOCAL_KEYS);
}

function getEdgeLocalState<EdgeData extends JsonObject>(
  edge: Edge<EdgeData>
): Partial<EdgeLocalState> {
  return pickDefined(edge, EDGE_LOCAL_KEYS);
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

  const prev = cache.get(id);
  const merged = { ...prev, ...next };

  if (prev && shallow(prev, merged)) {
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
    omitKeys(node, NODE_LOCAL_KEYS) as unknown as LsonObject
  ) as LiveblocksNode<NodeData>;
}

function edgeToStorage<EdgeData extends JsonObject>(
  edge: Edge<EdgeData>
): LiveblocksEdge<EdgeData> {
  return new LiveObject({
    ...omitKeys(edge, EDGE_LOCAL_KEYS),
    data: (edge.data ?? {}) as EdgeData,
  } as unknown as LsonObject) as LiveblocksEdge<EdgeData>;
}

function reconcile<T extends { id: string }>(next: T, cache: Map<string, T>) {
  const prev = cache.get(next.id);

  if (prev && shallow(prev, next)) {
    return prev;
  }

  cache.set(next.id, next);
  return next;
}

export function useLiveblocksFlow<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>() {
  const nodeCache = useRef<Map<string, Node<NodeData>>>(new Map());
  const edgeCache = useRef<Map<string, Edge<EdgeData>>>(new Map());
  const nodeLocalStateCache = useRef<Map<string, Partial<NodeLocalState>>>(
    new Map()
  );
  const edgeLocalStateCache = useRef<Map<string, Partial<EdgeLocalState>>>(
    new Map()
  );

  const nodes =
    useStorage((root) => {
      const flow = (root as ImmutableStorageRoot<NodeData, EdgeData> | null)
        ?.flow;
      const map = flow?.nodes;

      if (!map) return [];

      const result: Node<NodeData>[] = [];

      for (const immutableNode of map.values()) {
        const merged = mergeLocalState(
          immutableNode as unknown as Node<NodeData>,
          nodeLocalStateCache.current
        );

        result.push(reconcile(merged, nodeCache.current));
      }

      return result;
    }) ?? [];

  const edges =
    useStorage((root) => {
      const flow = (root as ImmutableStorageRoot<NodeData, EdgeData> | null)
        ?.flow;
      const map = flow?.edges;

      if (!map) return [];

      const result: Edge<EdgeData>[] = [];

      for (const immutableEdge of map.values()) {
        const merged = mergeLocalState(
          immutableEdge as unknown as Edge<EdgeData>,
          edgeLocalStateCache.current
        );

        result.push(reconcile(merged, edgeCache.current));
      }

      return result;
    }) ?? [];

  const onNodesChange = useMutation(
    ({ storage }, changes: NodeChange<Node<NodeData>>[]) => {
      const root = storage as StorageRoot<NodeData, EdgeData>;
      const nodes = getFlow(root).get("nodes");
      const upsertNode = (node: Node<NodeData>) => {
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
            if (!node || !change.position) break;

            const prev = node.get("position") as
              | Node<NodeData>["position"]
              | undefined;

            if (
              prev?.x !== change.position.x ||
              prev?.y !== change.position.y
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
    ({ storage }, changes: EdgeChange<Edge<EdgeData>>[]) => {
      const root = storage as StorageRoot<NodeData, EdgeData>;
      const edges = getFlow(root).get("edges");
      const upsertEdge = (edge: Edge<EdgeData>) => {
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
    const root = storage as StorageRoot<NodeData, EdgeData>;
    const edges = getFlow(root).get("edges");

    const current = Array.from(
      edges.values(),
      (edge) => edge.toObject() as unknown as Edge<EdgeData>
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

export function createLiveblocksFlowStorage<
  NodeData extends JsonObject = JsonObject,
  EdgeData extends JsonObject = JsonObject,
>({
  nodes = [],
  edges = [],
}: {
  nodes?: Node<NodeData>[];
  edges?: Edge<EdgeData>[];
} = {}) {
  return {
    flow: new LiveObject({
      nodes: new LiveMap(nodes.map((node) => [node.id, nodeToStorage(node)])),
      edges: new LiveMap(edges.map((edge) => [edge.id, edgeToStorage(edge)])),
    }),
  };
}
