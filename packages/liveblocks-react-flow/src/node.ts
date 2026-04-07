import type { JsonObject, LsonObject } from "@liveblocks/core";
import { LiveMap, LiveObject } from "@liveblocks/core";
import type { BuiltInEdge, BuiltInNode, Edge, Node } from "@xyflow/react";

import {
  buildEdgeConfigCache,
  buildNodeConfigCache,
  DEFAULT_STORAGE_KEY,
  toLiveblocksInternalEdge,
  toLiveblocksInternalNode,
} from "./helpers";
import type {
  EdgeSyncConfig,
  InternalLiveblocksFlow,
  NodeSyncConfig,
} from "./types";

/**
 * A minimal interface for the Liveblocks Node client — just the
 * `mutateStorage` method we actually need. This avoids importing
 * `@liveblocks/node` as a dependency.
 */
interface ILiveblocksClient {
  mutateStorage(
    roomId: string,
    callback: (context: {
      root: LiveObject<LsonObject>;
    }) => void | Promise<void>
  ): Promise<void>;
}

/** Options for `mutateFlow()`. */
export interface MutateFlowOptions<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
> {
  client: ILiveblocksClient;
  roomId: string;
  storageKey?: string;
  nodes?: { sync?: NodeSyncConfig<N> };
  edges?: { sync?: EdgeSyncConfig<E> };
}

export interface MutableFlow<N extends Node, E extends Edge> {
  /** The current list of nodes. */
  readonly nodes: readonly N[];
  /** The current list of edges. */
  readonly edges: readonly E[];
  /** Returns a plain object snapshot with `nodes` and `edges` arrays. */
  toJSON(): {
    nodes: readonly N[];
    edges: readonly E[];
  };

  /** Returns a single node by ID, or `undefined` if not found. */
  getNode(id: string): N | undefined;
  /** Returns a single edge by ID, or `undefined` if not found. */
  getEdge(id: string): E | undefined;

  /** Adds a node. If a node with the same ID already exists, it is replaced. */
  addNode(node: N): void;
  /** Adds multiple nodes. Existing nodes with the same IDs are replaced. */
  addNodes(nodes: N[]): void;
  /** Updates a node by merging a partial object. No-op if the node does not exist. */
  updateNode(id: string, partial: Partial<N>): void;
  /** Updates a node using an updater function. Always return a new object, never mutate in-place. No-op if the node does not exist. */
  updateNode(id: string, updater: (node: N) => N): void;
  /** Updates a node's `data` by merging a partial object. No-op if the node does not exist. */
  updateNodeData(id: string, partial: Partial<N["data"]>): void;
  /** Updates a node's `data` using an updater function. Always return a new object, never mutate in-place. No-op if the node does not exist. */
  updateNodeData<D extends N["data"]>(
    id: string,
    updater: (data: D) => D
  ): void;
  /** Removes a node by ID. */
  removeNode(id: string): void;
  /** Removes multiple nodes by ID. */
  removeNodes(ids: string[]): void;

  /** Adds an edge. If an edge with the same ID already exists, it is replaced. */
  addEdge(edge: E): void;
  /** Adds multiple edges. Existing edges with the same IDs are replaced. */
  addEdges(edges: E[]): void;
  /** Updates an edge by merging a partial object. No-op if the edge does not exist. */
  updateEdge(id: string, partial: Partial<E>): void;
  /** Updates an edge using an updater function. Always return a new object, never mutate in-place. No-op if the edge does not exist. */
  updateEdge(id: string, updater: (edge: E) => E): void;
  /** Updates an edge's `data` by merging a partial object. No-op if the edge does not exist. */
  updateEdgeData(id: string, partial: Partial<NonNullable<E["data"]>>): void;
  /** Updates an edge's `data` using an updater function. Always return a new object, never mutate in-place. No-op if the edge does not exist. */
  updateEdgeData<D extends E["data"]>(
    id: string,
    updater: (data: D) => D
  ): void;
  /** Removes an edge by ID. */
  removeEdge(id: string): void;
  /** Removes multiple edges by ID. */
  removeEdges(ids: string[]): void;
}

/**
 * Opens a flow (a collection of React Flow nodes and edges) for reading and
 * mutating, then automatically flushes all changes when the callback
 * completes.
 *
 * @example
 * ```ts
 * await mutateFlow({ client, roomId: "my-room" }, (flow) => {
 *   flow.addNode({ id: "1", position: { x: 0, y: 0 }, data: {} });
 *   flow.updateNodeData("1", { label: "Hello" });
 * });
 * ```
 */
export async function mutateFlow<
  N extends Node = BuiltInNode,
  E extends Edge = BuiltInEdge,
>(
  options: MutateFlowOptions<N, E>,
  callback: (flow: MutableFlow<N, E>) => void | Promise<void>
): Promise<void> {
  const { client, roomId } = options;
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;

  const getNodeSyncConfig = buildNodeConfigCache(options.nodes?.sync);
  const getEdgeSyncConfig = buildEdgeConfigCache(options.edges?.sync);

  const nodeListCache = new WeakMap<Record<string, N>, N[]>();
  const edgeListCache = new WeakMap<Record<string, E>, E[]>();

  await client.mutateStorage(roomId, async ({ root }) => {
    let flow = root.get(storageKey) as InternalLiveblocksFlow | undefined;
    if (!flow) {
      const newFlow = new LiveObject({
        nodes: new LiveMap(),
        edges: new LiveMap(),
      }) satisfies InternalLiveblocksFlow;
      root.set(storageKey, newFlow);
      flow = newFlow;
    }

    const nodesLiveMap = flow.get("nodes");
    const edgesLiveMap = flow.get("edges");

    function getNodes(): readonly N[] {
      const nodeMap = nodesLiveMap.toJSON() as unknown as Record<string, N>;
      if (!nodeListCache.has(nodeMap)) {
        // TODO (LB-3665): To support sub-nodes, this function will need to emit nodes
        // in topological order (parents before children), deferring any node with a
        // parentId until its parent has been emitted.
        nodeListCache.set(nodeMap, Object.values(nodeMap));
      }
      return nodeListCache.get(nodeMap)!;
    }

    function getEdges(): readonly E[] {
      const edgeMap = edgesLiveMap.toJSON() as unknown as Record<string, E>;
      if (!edgeListCache.has(edgeMap)) {
        edgeListCache.set(edgeMap, Object.values(edgeMap));
      }
      return edgeListCache.get(edgeMap)!;
    }

    function getNode(id: string) {
      return nodesLiveMap.get(id)?.toJSON() as N | undefined;
    }
    function getEdge(id: string) {
      return edgesLiveMap.get(id)?.toJSON() as E | undefined;
    }

    function upsertNode(id: string, newNode: N) {
      const existing = nodesLiveMap.get(id);
      const syncConfig = getNodeSyncConfig(newNode.type);
      if (!existing) {
        nodesLiveMap.set(id, toLiveblocksInternalNode(newNode, syncConfig));
      } else {
        existing.reconcile(newNode as unknown as JsonObject, syncConfig);
      }
    }

    function upsertEdge(id: string, newEdge: E) {
      const existing = edgesLiveMap.get(id);
      const syncConfig = getEdgeSyncConfig(newEdge.type);
      if (!existing) {
        edgesLiveMap.set(id, toLiveblocksInternalEdge(newEdge, syncConfig));
      } else {
        existing.reconcile(newEdge as unknown as JsonObject, syncConfig);
      }
    }

    const mutableFlow: MutableFlow<N, E> = {
      get nodes() {
        return getNodes();
      },
      get edges() {
        return getEdges();
      },
      toJSON() {
        return { nodes: getNodes(), edges: getEdges() };
      },
      getNode,
      getEdge,

      addNode(node: N) {
        upsertNode(node.id, node);
      },
      addNodes(nodes: N[]) {
        for (const node of nodes) {
          mutableFlow.addNode(node);
        }
      },
      updateNode(id: string, partialOrUpdater: Partial<N> | ((node: N) => N)) {
        const oldNode = getNode(id);
        if (!oldNode) return;

        let newNode: N;
        if (typeof partialOrUpdater === "function") {
          newNode = partialOrUpdater(oldNode);
        } else {
          newNode = { ...oldNode, ...partialOrUpdater };
        }
        return upsertNode(id, newNode);
      },
      updateNodeData(
        id: string,
        partialOrUpdater:
          | Partial<N["data"]>
          | (<D extends N["data"]>(data: D) => D)
      ) {
        return mutableFlow.updateNode(id, (node) => {
          const currData = node.data ?? ({} as N["data"]);
          const newData =
            typeof partialOrUpdater === "function"
              ? partialOrUpdater(currData)
              : { ...currData, ...partialOrUpdater };
          return { ...node, data: newData };
        });
      },
      removeNode(id: string) {
        nodesLiveMap.delete(id);
      },
      removeNodes(ids: string[]) {
        for (const id of ids) {
          nodesLiveMap.delete(id);
        }
      },

      addEdge(edge: E) {
        upsertEdge(edge.id, edge);
      },
      addEdges(edges: E[]) {
        for (const edge of edges) {
          mutableFlow.addEdge(edge);
        }
      },
      updateEdge(id: string, partialOrUpdater: Partial<E> | ((edge: E) => E)) {
        const oldEdge = getEdge(id);
        if (!oldEdge) return;

        let newEdge: E;
        if (typeof partialOrUpdater === "function") {
          newEdge = partialOrUpdater(oldEdge);
        } else {
          newEdge = { ...oldEdge, ...partialOrUpdater };
        }
        return upsertEdge(id, newEdge);
      },
      updateEdgeData(
        id: string,
        partialOrUpdater:
          | Partial<NonNullable<E["data"]>>
          | (<D extends E["data"]>(data: D) => D)
      ) {
        return mutableFlow.updateEdge(id, (edge) => {
          const currData = edge.data;
          const newData =
            typeof partialOrUpdater === "function"
              ? partialOrUpdater(currData)
              : { ...currData, ...partialOrUpdater };
          return { ...edge, data: newData };
        });
      },
      removeEdge(id: string) {
        edgesLiveMap.delete(id);
      },
      removeEdges(ids: string[]) {
        for (const id of ids) {
          edgesLiveMap.delete(id);
        }
      },
    };

    await callback(mutableFlow);
  });
}
