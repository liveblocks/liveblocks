import { type Json, LiveMap, LiveObject } from "@liveblocks/core";
import { useMutation, useStorage, useStorageRoot } from "@liveblocks/react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LiveblocksEdge, LiveblocksNode } from "./types";

const FLOW_STORAGE_KEY = "flow";
const NODES_STORAGE_KEY = "nodes";
const EDGES_STORAGE_KEY = "edges";

type UseLiveblocksFlowOptions<N extends Node, E extends Edge> = {
  initialNodes?: N[];
  initialEdges?: E[];
};

type UseLiveblocksFlowResult<N extends Node, E extends Edge> = {
  nodes: N[];
  edges: E[];
  onNodesChange: OnNodesChange<N>;
  onEdgesChange: OnEdgesChange<E>;
  onConnect: OnConnect;
};

type MutableRoot = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

type ValueIterableMap<T> = {
  values: () => IterableIterator<T>;
};

type MutableValueMap<T> = ValueIterableMap<T> & {
  size: number;
  keys: () => IterableIterator<string>;
  set: (key: string, value: T) => void;
  delete: (key: string) => boolean;
};

type FlowStorageSnapshot = {
  flow?: {
    nodes?: ReadonlyMap<string, LiveblocksNode<Json>>;
    edges?: ReadonlyMap<string, LiveblocksEdge<Json>>;
  };
};

function asArrayFromMap<T>(map: ValueIterableMap<T> | null | undefined): T[] {
  return map ? Array.from(map.values()) : [];
}

function getOrCreateMap<T>(
  storage: MutableRoot,
  key: string
): MutableValueMap<T> {
  const existing = storage.get(key);

  if (existing) {
    return existing as unknown as MutableValueMap<T>;
  }

  const map = new LiveMap<string, never>();
  storage.set(key, map);

  return map as unknown as MutableValueMap<T>;
}

function getOrCreateFlow(storage: MutableRoot): MutableRoot {
  const existing = storage.get(FLOW_STORAGE_KEY);

  if (existing) {
    return existing as MutableRoot;
  }

  const flow = new LiveObject({
    [NODES_STORAGE_KEY]: new LiveMap<string, never>(),
    [EDGES_STORAGE_KEY]: new LiveMap<string, never>(),
  });
  storage.set(FLOW_STORAGE_KEY, flow);

  return flow as unknown as MutableRoot;
}

function getFlowMap<T>(storage: MutableRoot, key: string): MutableValueMap<T> {
  return getOrCreateMap<T>(getOrCreateFlow(storage), key);
}

function getMutableRoot(storage: unknown): MutableRoot {
  return storage as MutableRoot;
}

function getNodesMap(storage: unknown): MutableValueMap<LiveblocksNode<Json>> {
  return getFlowMap<LiveblocksNode<Json>>(
    getMutableRoot(storage),
    NODES_STORAGE_KEY
  );
}

function getEdgesMap(storage: unknown): MutableValueMap<LiveblocksEdge<Json>> {
  return getFlowMap<LiveblocksEdge<Json>>(
    getMutableRoot(storage),
    EDGES_STORAGE_KEY
  );
}

function serializeNode<N extends Node>(node: N): LiveblocksNode<Json> {
  const { id, type, parentId, extent, position, width, height, data } = node;

  return {
    id,
    type,
    parentId,
    extent,
    position,
    width,
    height,
    data: data as Json,
  };
}

function serializeEdge<E extends Edge>(edge: E): LiveblocksEdge<Json> {
  const { id, type, source, target, sourceHandle, targetHandle, data } = edge;

  return {
    id,
    type,
    source,
    target,
    sourceHandle,
    targetHandle,
    data: (data ?? null) as Json,
  };
}

function applySelectionState<T extends { id: string; selected?: boolean }>(
  items: T[],
  selectedIds: ReadonlySet<string>
): T[] {
  if (selectedIds.size === 0) return items;

  return items.map((item) => {
    if (selectedIds.has(item.id)) {
      return item.selected === true ? item : { ...item, selected: true };
    }

    return item.selected ? { ...item, selected: false } : item;
  });
}

function applySelectChanges(
  previous: ReadonlySet<string>,
  changes: ReadonlyArray<{ id: string; selected: boolean }>
): ReadonlySet<string> {
  let next: Set<string> | undefined;

  for (const { id, selected } of changes) {
    const current = next ?? previous;
    const hasId = current.has(id);
    if (selected === hasId) continue;

    next ??= new Set(previous);

    if (selected) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }

  return next ?? previous;
}

function removeFromSelection(
  previous: ReadonlySet<string>,
  ids: Iterable<string>
): ReadonlySet<string> {
  if (previous.size === 0) return previous;

  let next: Set<string> | undefined;

  for (const id of ids) {
    const current = next ?? previous;

    if (!current.has(id)) {
      continue;
    }

    next ??= new Set(previous);
    next.delete(id);
  }

  return next ?? previous;
}

function pruneSelection(
  previous: ReadonlySet<string>,
  remoteItems: ReadonlyArray<{ id: string }>
): ReadonlySet<string> {
  if (previous.size === 0) return previous;

  const remoteIds = new Set(remoteItems.map((item) => item.id));
  let next: Set<string> | undefined;

  for (const id of previous) {
    if (remoteIds.has(id)) {
      continue;
    }

    next ??= new Set(previous);
    next.delete(id);
  }

  return next ?? previous;
}

function syncMap<T extends { id: string }, S>(
  map: MutableValueMap<S>,
  items: T[],
  serialize: (item: T) => S
): void {
  const nextIds = new Set<string>();

  for (const item of items) {
    nextIds.add(item.id);
    map.set(item.id, serialize(item));
  }

  for (const id of map.keys()) {
    if (!nextIds.has(id)) {
      map.delete(id);
    }
  }
}

export function useLiveblocksFlow<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>(
  options: UseLiveblocksFlowOptions<NodeType, EdgeType> = {}
): UseLiveblocksFlowResult<NodeType, EdgeType> {
  const initialNodes = useMemo(
    () => options.initialNodes ?? [],
    [options.initialNodes]
  );
  const initialEdges = useMemo(
    () => options.initialEdges ?? [],
    [options.initialEdges]
  );
  const [storageRoot] = useStorageRoot();
  const remoteNodesMap = useStorage(
    (root) => (root as FlowStorageSnapshot).flow?.nodes
  );
  const remoteEdgesMap = useStorage(
    (root) => (root as FlowStorageSnapshot).flow?.edges
  );

  const [selectedNodeIds, setSelectedNodeIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const remoteNodes = useMemo(
    () => asArrayFromMap(remoteNodesMap) as unknown as NodeType[],
    [remoteNodesMap]
  );
  const remoteEdges = useMemo(
    () => asArrayFromMap(remoteEdgesMap) as unknown as EdgeType[],
    [remoteEdgesMap]
  );

  const nodes = useMemo(
    () => applySelectionState(remoteNodes, selectedNodeIds),
    [remoteNodes, selectedNodeIds]
  );
  const edges = useMemo(
    () => applySelectionState(remoteEdges, selectedEdgeIds),
    [remoteEdges, selectedEdgeIds]
  );

  const initializedRef = useRef(false);

  const initializeStorage = useMutation(
    (
      { storage },
      nextInitialNodes: NodeType[],
      nextInitialEdges: EdgeType[]
    ) => {
      const nodesMap = getNodesMap(storage);
      const edgesMap = getEdgesMap(storage);
      if (nodesMap.size === 0) {
        for (const node of nextInitialNodes)
          nodesMap.set(node.id, serializeNode(node));
      }
      if (edgesMap.size === 0) {
        for (const edge of nextInitialEdges)
          edgesMap.set(edge.id, serializeEdge(edge));
      }
    },
    []
  );

  const applyPersistentNodeChanges = useMutation(
    ({ storage }, changes: NodeChange<NodeType>[]) => {
      if (changes.length === 0) {
        return;
      }

      const nodesMap = getNodesMap(storage);
      const currentNodes = asArrayFromMap(nodesMap) as unknown as NodeType[];
      const updatedNodes = applyNodeChanges(changes, currentNodes);
      const byId = new Map(updatedNodes.map((n) => [n.id, n]));

      for (const change of changes) {
        if (change.type === "remove") {
          nodesMap.delete(change.id);
        } else {
          const id = change.type === "add" ? change.item.id : change.id;
          const node = byId.get(id);

          if (node) {
            nodesMap.set(id, serializeNode(node));
          }
        }
      }
    },
    []
  );

  const applyPersistentEdgeChanges = useMutation(
    ({ storage }, changes: EdgeChange<EdgeType>[]) => {
      if (changes.length === 0) {
        return;
      }

      const edgesMap = getEdgesMap(storage);
      const currentEdges = asArrayFromMap(edgesMap) as unknown as EdgeType[];
      const updatedEdges = applyEdgeChanges(changes, currentEdges);
      const byId = new Map(updatedEdges.map((e) => [e.id, e]));

      for (const change of changes) {
        if (change.type === "remove") {
          edgesMap.delete(change.id);
        } else {
          const id = change.type === "add" ? change.item.id : change.id;
          const edge = byId.get(id);

          if (edge) {
            edgesMap.set(id, serializeEdge(edge));
          }
        }
      }
    },
    []
  );

  const onNodesChange = useCallback<OnNodesChange<NodeType>>(
    (changes) => {
      const selectChanges = changes.filter(
        (c): c is Extract<NodeChange<NodeType>, { type: "select" }> =>
          c.type === "select"
      );

      if (selectChanges.length > 0) {
        setSelectedNodeIds((previous) =>
          applySelectChanges(previous, selectChanges)
        );
      }

      // "dimensions" changes fire on every render as React Flow measures nodes.
      // Persisting them causes an infinite loop (storage update → re-render →
      // re-measure → storage update …).
      const persistentChanges = changes.filter(
        (c) => c.type !== "dimensions" && c.type !== "select"
      );
      const removeChanges = persistentChanges.filter(
        (c): c is Extract<NodeChange<NodeType>, { type: "remove" }> =>
          c.type === "remove"
      );

      if (removeChanges.length > 0) {
        setSelectedNodeIds((previous) =>
          removeFromSelection(
            previous,
            removeChanges.map((change) => change.id)
          )
        );
      }

      applyPersistentNodeChanges(persistentChanges);
    },
    [applyPersistentNodeChanges]
  );

  const onEdgesChange = useCallback<OnEdgesChange<EdgeType>>(
    (changes) => {
      const selectChanges = changes.filter(
        (c): c is Extract<EdgeChange<EdgeType>, { type: "select" }> =>
          c.type === "select"
      );

      if (selectChanges.length > 0) {
        setSelectedEdgeIds((previous) =>
          applySelectChanges(previous, selectChanges)
        );
      }

      const persistentChanges = changes.filter((c) => c.type !== "select");
      const removeChanges = persistentChanges.filter(
        (c): c is Extract<EdgeChange<EdgeType>, { type: "remove" }> =>
          c.type === "remove"
      );

      if (removeChanges.length > 0) {
        setSelectedEdgeIds((previous) =>
          removeFromSelection(
            previous,
            removeChanges.map((change) => change.id)
          )
        );
      }

      applyPersistentEdgeChanges(persistentChanges);
    },
    [applyPersistentEdgeChanges]
  );

  const onConnect = useMutation(
    ({ storage }, connection: Parameters<OnConnect>[0]) => {
      const edgesMap = getEdgesMap(storage);
      const currentEdges = asArrayFromMap(edgesMap) as unknown as EdgeType[];
      const nextEdges = addEdge(connection, currentEdges);

      syncMap(edgesMap, nextEdges, serializeEdge);
    },
    []
  );

  useEffect(() => {
    if (initializedRef.current || storageRoot === null) {
      return;
    }

    initializedRef.current = true;

    initializeStorage(initialNodes, initialEdges);
  }, [storageRoot, initializeStorage, initialNodes, initialEdges]);

  useEffect(() => {
    setSelectedNodeIds((previous) => pruneSelection(previous, remoteNodes));
  }, [remoteNodes]);

  useEffect(() => {
    setSelectedEdgeIds((previous) => pruneSelection(previous, remoteEdges));
  }, [remoteEdges]);

  return useMemo(
    () => ({
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
    }),
    [nodes, edges, onNodesChange, onEdgesChange, onConnect]
  );
}
