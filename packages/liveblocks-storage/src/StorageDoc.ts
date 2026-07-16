import type { ApplyResult } from "./crdts/AbstractCrdt";
import { OpSource } from "./crdts/AbstractCrdt";
import { LiveList } from "./crdts/LiveList";
import type { LiveObject } from "./crdts/LiveObject";
import { LiveObject as LiveObjectClass } from "./crdts/LiveObject";
import type { LiveNode, LsonObject } from "./crdts/Lson";
import { mergeStorageUpdates } from "./crdts/mergeStorageUpdates";
import type { StorageUpdate } from "./crdts/StorageUpdates";
import { nn } from "./lib/assert";
import { asPos } from "./lib/position";
import { PendingOps, type ReadonlyPendingOps } from "./PendingOps";
import type { ClientWireOp, Op, ServerWireOp } from "./protocol/Op";
import { isIgnoredOp, OpCode } from "./protocol/Op";
import type { NodeStream, StorageNode } from "./protocol/StorageNode";

export type StorageUpdateEvent = {
  /**
   * Ops produced by a local mutation (always include opIds). A sync layer can
   * send these over the network, persist them, etc.
   */
  readonly ops: readonly ClientWireOp[];
  /**
   * Reverse ops suitable for undo stacks. May omit opIds (assigned on apply).
   */
  readonly reverse: readonly Op[];
  /**
   * In-client structure updates for UI subscribers.
   */
  readonly updates: ReadonlyMap<string, StorageUpdate>;
};

export type ApplyOpsResult = {
  /** Reverse ops from applied mutations (for undo). */
  readonly reverse: Op[];
  /** Merged in-client storage updates produced by this batch. */
  readonly updates: Map<string, StorageUpdate>;
};

export type ApplyOpsOptions = {
  /**
   * Force every op in the batch to this source.
   *
   * When omitted (typical for inbound server messages):
   * - ops with an `opId` are treated as OURS (confirmed, then applied)
   * - ops without an `opId` are treated as THEIRS
   */
  source?: OpSource;
};

export type StorageDocOptions = {
  /**
   * Returns the current actor / connection id used as a prefix for generated
   * node and op ids. May change over time (e.g. on reconnect).
   */
  getActorId?: () => number;

  /**
   * When false, local mutations throw. Sync layers can flip this based on
   * permissions. Defaults to true.
   */
  writable?: boolean;
};

/**
 * Document runtime for a tree of Live structures.
 *
 * Owns node identity, pending local ops, and the update subscription stream.
 * Does **not** know about WebSockets, Room, or undo — those are listeners /
 * drivers of this doc.
 */
export class StorageDoc {
  readonly #nodes = new Map<string, LiveNode>();
  readonly #pending = new PendingOps();
  readonly #listeners = new Set<(event: StorageUpdateEvent) => void>();
  readonly #getActorId: () => number;

  #nodeClock = 0;
  #opClock = 0;
  #writable: boolean;
  #root: LiveObject<LsonObject> | undefined;

  constructor(options: StorageDocOptions = {}) {
    this.#getActorId = options.getActorId ?? (() => 0);
    this.#writable = options.writable ?? true;
  }

  /**
   * Hydrate a new document from a storage node stream (snapshot / full sync).
   */
  static fromNodes(
    nodes: NodeStream,
    options?: StorageDocOptions
  ): { doc: StorageDoc; root: LiveObject<LsonObject> } {
    const doc = new StorageDoc(options);
    const root = doc.load(nodes);
    return { doc, root };
  }

  /**
   * Root LiveObject after {@link StorageDoc.attach} / {@link StorageDoc.load},
   * if it was registered under id `"root"` or set via load/fromNodes.
   */
  get root(): LiveObject<LsonObject> | undefined {
    return this.#root;
  }

  get writable(): boolean {
    return this.#writable;
  }

  setWritable(writable: boolean): void {
    this.#writable = writable;
  }

  /**
   * @internal Registry of attached nodes by id. Used by Live structures and
   * apply — not part of the public sync API.
   */
  get nodes(): ReadonlyMap<string, LiveNode> {
    return this.#nodes;
  }

  /**
   * @internal Still-pending local ops (emitted, not yet confirmed). LiveList
   * and others read this for optimistic concurrency. Sync layers should use
   * {@link StorageDoc.apply} / {@link StorageDoc.confirm} /
   * {@link StorageDoc.markAllAsPossiblyStored} instead.
   */
  get pending(): ReadonlyPendingOps {
    return this.#pending;
  }

  /** @internal */
  getNode(id: string): LiveNode | undefined {
    return this.#nodes.get(id);
  }

  /** @internal */
  addNode(id: string, node: LiveNode): void {
    this.#nodes.set(id, node);
  }

  /** @internal */
  deleteNode(id: string): void {
    this.#nodes.delete(id);
  }

  /** @internal Mint a new CRDT node id (`actor:clock`). */
  generateId(): string {
    return `${this.#getActorId()}:${this.#nodeClock++}`;
  }

  /** @internal Mint a new op id (`actor:clock`) for outbound wire ops. */
  generateOpId(): string {
    return `${this.#getActorId()}:${this.#opClock++}`;
  }

  /** @internal */
  assertWritable(): void {
    if (!this.#writable) {
      throw new Error(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    }
  }

  /**
   * Attach a (detached) Live node to this document, assigning it an id if
   * needed. Nested children are attached recursively by the structure.
   *
   * When `id` is `"root"` and the node is a LiveObject, it becomes
   * {@link StorageDoc.root}.
   */
  attach(node: LiveNode, id: string = this.generateId()): void {
    node._attach(id, this);
    if (id === "root" && node instanceof LiveObjectClass) {
      this.#root = node;
    }
  }

  /**
   * Load a full storage snapshot into this (empty) document.
   * Returns the root LiveObject.
   */
  load(nodes: NodeStream): LiveObject<LsonObject> {
    if (this.#nodes.size > 0) {
      throw new Error("Cannot load into a StorageDoc that already has nodes");
    }
    const root = LiveObjectClass._fromItems(nodes, this);
    this.#root = root;
    return root;
  }

  /**
   * Snapshot all attached nodes as a storage node stream (for persistence or
   * sending to a peer that will call {@link StorageDoc.fromNodes}).
   */
  toNodeStream(): StorageNode[] {
    const result: StorageNode[] = [];
    for (const [id, node] of this.#nodes) {
      result.push([id, node._serialize()] as StorageNode);
    }
    return result;
  }

  /**
   * Subscribe to local mutation events. Returns an unsubscribe function.
   *
   * Does **not** fire for {@link StorageDoc.apply} (inbound sync). Sync layers
   * should use the return value of `apply` for remote UI updates.
   */
  subscribe(listener: (event: StorageUpdateEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /**
   * Confirm that a previously emitted op was acknowledged by the remote
   * authority. Prefer letting {@link StorageDoc.apply} do this automatically
   * for inbound ops that carry an `opId`.
   */
  confirm(opId: string): void {
    this.#pending.delete(opId);
  }

  /**
   * Mark every currently pending op as possibly already stored remotely.
   * Call when a connection dies and in-flight acks may have been lost.
   */
  markAllAsPossiblyStored(): void {
    this.#pending.markAllAsPossiblyStored();
  }

  /**
   * Apply a batch of ops to this document (inbound sync, undo replay, etc.).
   *
   * When `source` is omitted: ops with an `opId` are treated as acknowledgements
   * of our pending locals (confirm, then apply as OURS); ops without are THEIRS.
   */
  apply(
    ops: readonly Op[] | readonly ServerWireOp[],
    options?: ApplyOpsOptions
  ): ApplyOpsResult {
    const forcedSource = options?.source;
    const storageUpdates = new Map<string, StorageUpdate>();
    const reverse: Op[] = [];
    const createdNodeIds = new Set<string>();

    for (const op of ops) {
      let source: OpSource;
      if (forcedSource !== undefined) {
        source = forcedSource;
      } else if (op.opId !== undefined) {
        // Confirm before applying an "ours" echo / ignored ack
        this.#pending.delete(op.opId);
        source = OpSource.OURS;
      } else {
        source = OpSource.THEIRS;
      }

      const applyOpResult = this.#applyOp(op, source);
      if (applyOpResult.modified) {
        const nodeId = applyOpResult.modified.node._id;

        if (!(nodeId && createdNodeIds.has(nodeId))) {
          storageUpdates.set(
            nn(applyOpResult.modified.node._id),
            mergeStorageUpdates(
              storageUpdates.get(nn(applyOpResult.modified.node._id)),
              applyOpResult.modified
            )
          );
          reverse.unshift(...applyOpResult.reverse);
        }

        if (
          op.type === OpCode.CREATE_LIST ||
          op.type === OpCode.CREATE_MAP ||
          op.type === OpCode.CREATE_OBJECT
        ) {
          createdNodeIds.add(op.id);
        }
      }
    }

    return { reverse, updates: storageUpdates };
  }

  #applyOp(op: Op | ServerWireOp, source: OpSource): ApplyResult {
    if (isIgnoredOp(op as ServerWireOp)) {
      return { modified: false };
    }

    switch (op.type) {
      case OpCode.DELETE_OBJECT_KEY:
      case OpCode.UPDATE_OBJECT:
      case OpCode.DELETE_CRDT: {
        const node = this.#nodes.get(op.id);
        if (node === undefined) {
          return { modified: false };
        }
        return node._apply(op, source === OpSource.LOCAL);
      }

      case OpCode.SET_PARENT_KEY: {
        const node = this.#nodes.get(op.id);
        if (node === undefined) {
          return { modified: false };
        }

        if (
          node.parent.type === "HasParent" &&
          node.parent.node instanceof LiveList
        ) {
          return node.parent.node._setChildKey(
            asPos(op.parentKey),
            node,
            source
          );
        }
        return { modified: false };
      }

      case OpCode.CREATE_OBJECT:
      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
      case OpCode.CREATE_REGISTER: {
        if (op.parentId === undefined) {
          return { modified: false };
        }

        const parentNode = this.#nodes.get(op.parentId);
        if (parentNode === undefined) {
          return { modified: false };
        }

        return parentNode._attachChild(op, source);
      }

      default:
        return { modified: false };
    }
  }

  /**
   * @internal Called by Live structures after a local mutation.
   * Records ops as pending and notifies subscribers.
   */
  emit(
    ops: ClientWireOp[],
    reverse: Op[],
    updates: Map<string, StorageUpdate>
  ): void {
    for (const op of ops) {
      this.#pending.add(op);
    }

    if (this.#listeners.size === 0) {
      return;
    }

    const event: StorageUpdateEvent = { ops, reverse, updates };
    for (const listener of this.#listeners) {
      listener(event);
    }
  }
}
