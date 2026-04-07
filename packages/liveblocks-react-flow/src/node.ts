/**
 * A minimal interface for the Liveblocks Node client: just the
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
export interface MutateFlowOptions<N extends Node, E extends Edge> {
  client: ILiveblocksClient;
  roomId: string;
  storageKey?: string;
  nodes?: { sync?: NodeSyncConfig<N> };
  edges?: { sync?: EdgeSyncConfig<E> };
}

export interface FlowDocument<N extends Node, E extends Edge> {
  getNode(id: string): N | undefined;
  getEdge(id: string): E | undefined;
  getNodes(): N[];
  getEdges(): E[];

  addNode(node: N): void;
  addNodes(nodes: N[]): void;
  updateNode(id: string, partial: Partial<N>): void;
  updateNode(id: string, updater: (node: N) => N): void;
  updateNodeData(id: string, partial: Partial<N["data"]>): void;
  updateNodeData<D extends N["data"]>(id: string, updater: (data: D) => D): void;
  removeNode(id: string): void;
  removeNodes(ids: string[]): void;

  addEdge(edge: E): void;
  addEdges(edges: E[]): void;
  updateEdge(id: string, partial: Partial<E>): void;
  updateEdge(id: string, updater: (edge: E) => E): void;
  updateEdgeData(id: string, partial: Partial<E["data"]>): void;
  updateEdgeData<D extends E["data"]>(id: string, updater: (data: D) => D): void;
  removeEdge(id: string): void;
  removeEdges(ids: string[]): void;
}

/**
 * Opens a Flow document for reading and mutating, then automatically
 * flushes all changes when the callback completes.
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
  E extends Edge = BuiltInEdge
>(
  options: MutateFlowOptions<N, E>,
  callback: (flow: FlowDocument<N, E>) => void | Promise<void>
): Promise<void> {
  ...
}
