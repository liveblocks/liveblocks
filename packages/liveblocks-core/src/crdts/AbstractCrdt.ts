import { assertNever } from "../lib/assert";
import type { Pos } from "../lib/position";
import { asPos } from "../lib/position";
import type { CreateOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { SerializedCrdt } from "../protocol/SerializedCrdt";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { Immutable } from "../types/Immutable";
import type { LiveNode, Lson } from "./Lson";
import type { StorageUpdate } from "./StorageUpdates";

export type ApplyResult =
  | { reverse: Op[]; modified: StorageUpdate }
  | { modified: false };

/**
 * The managed pool is a namespace registry (i.e. a context) that "owns" all
 * the individual live nodes, ensuring each one has a unique ID, and holding on
 * to live nodes before and after they are inter-connected.
 */
export interface ManagedPool {
  readonly roomId: string;
  readonly nodes: ReadonlyMap<string, LiveNode>;
  readonly generateId: () => string;
  readonly generateOpId: () => string;

  readonly getNode: (id: string) => LiveNode | undefined;
  readonly addNode: (id: string, node: LiveNode) => void;
  readonly deleteNode: (id: string) => void;

  /**
   * Dispatching has three responsibilities:
   * - Sends serialized ops to the WebSocket servers
   * - Add reverse operations to the undo/redo stack
   * - Notify room subscribers with updates (in-client, no networking)
   */
  dispatch: (
    ops: Op[],
    reverseOps: Op[],
    storageUpdates: Map<string, StorageUpdate>
  ) => void;

  /**
   * Ensures storage can be written to else throws an error.
   * This is used to prevent writing to storage when the user does not have
   * permission to do so.
   * @throws {Error} if storage is not writable
   * @returns {void}
   */
  assertStorageIsWritable: () => void;
}

export type CreateManagedPoolOptions = {
  /**
   * Returns the current connection ID. This is used to generate unique
   * prefixes for nodes created by this client. This number is allowed to
   * change over time (for example, when the client reconnects).
   */
  getCurrentConnectionId(): number;

  /**
   * Will get invoked when any Live structure calls .dispatch() on the pool.
   */
  onDispatch?: (
    ops: Op[],
    reverse: Op[],
    storageUpdates: Map<string, StorageUpdate>
  ) => void;

  /**
   * Will get invoked when any Live structure calls .assertStorageIsWritable()
   * on the pool. Defaults to true when not provided. Return false if you want
   * to prevent writes to the pool locally early, because you know they won't
   * have an effect upstream.
   */
  isStorageWritable?: () => boolean;
};

/**
 * @private Private API, never use this API directly.
 */
export function createManagedPool(
  roomId: string,
  options: CreateManagedPoolOptions
): ManagedPool {
  const {
    getCurrentConnectionId,
    onDispatch,
    isStorageWritable = () => true,
  } = options;

  let clock = 0;
  let opClock = 0;
  const nodes = new Map<string, LiveNode>();

  return {
    roomId,
    nodes,

    getNode: (id: string) => nodes.get(id),
    addNode: (id: string, node: LiveNode) => void nodes.set(id, node),
    deleteNode: (id: string) => void nodes.delete(id),

    generateId: () => `${getCurrentConnectionId()}:${clock++}`,
    generateOpId: () => `${getCurrentConnectionId()}:${opClock++}`,

    dispatch(
      ops: Op[],
      reverse: Op[],
      storageUpdates: Map<string, StorageUpdate>
    ) {
      onDispatch?.(ops, reverse, storageUpdates);
    },

    assertStorageIsWritable: () => {
      if (!isStorageWritable()) {
        throw new Error(
          "Cannot write to storage with a read only user, please ensure the user has write permissions"
        );
      }
    },
  };
}

/**
 * When applying an op to a CRDT, we need to know where it came from to apply
 * it correctly.
 */
export enum OpSource {
  /**
   * Optimistic update applied locally (from an undo, redo, or reconnect). Not
   * yet acknowledged by the server. Will be sent to server and needs to be
   * tracked for conflict resolution.
   */
  LOCAL,

  /**
   * Op received from server, originated from another client. Apply it, unless
   * there's a pending local op for the same key (local ops take precedence
   * until acknowledged).
   */
  REMOTE,

  /**
   * Op received from server, but originated from THIS client. The server
   * "fixed" the op (e.g., corrected position after conflict resolution) and
   * echoed it back. Fix-ops double as an implicit ack. Needs reconciliation
   * because local state may have diverged since the Op was sent.
   */
  FIXOP,
}

// TODO Temporary helper to help convert from AbstractCrdt -> LiveNode, only
// needed for within this module. The reason is that AbstractCrdt is an
// _abstract_ type, and in our LiveNode union we exhaustively include all
// concrete types.
// TODO Remove me later, if we inline the abstract base methods in the concrete
// classes.
function crdtAsLiveNode(
  value: AbstractCrdt // eslint-disable-line no-restricted-syntax
): LiveNode {
  return value as LiveNode;
}

type HasParent = {
  readonly type: "HasParent";
  readonly node: LiveNode;
  readonly key: string;

  // Typically the same as `key`, but checked to be a valid Pos value (needed
  // when used as item in a LiveList)
  readonly pos: Pos;
};

type NoParent = {
  readonly type: "NoParent";
};

type Orphaned = {
  readonly type: "Orphaned";
  readonly oldKey: string;

  // Typically the same as `key`, but checked to be a valid Pos value (needed
  // when used as item in a LiveList)
  readonly oldPos: Pos;
};

function HasParent(
  node: LiveNode,
  key: string,
  pos: Pos = asPos(key)
): HasParent {
  return Object.freeze({ type: "HasParent", node, key, pos });
}

const NoParent: NoParent = Object.freeze({ type: "NoParent" });

function Orphaned(oldKey: string, oldPos: Pos = asPos(oldKey)): Orphaned {
  return Object.freeze({ type: "Orphaned", oldKey, oldPos });
}

/**
 * Represents the possible states of the parent field pointers.
 */
type ParentInfo =
  // Both the parent node and the parent key are set. This is a normal child.
  | HasParent

  // Neither are set. This is either the root node (if attached to a document),
  // or it's a dangling node that hasn't been attached yet.
  | NoParent

  // -------------------------------------------------------------------------
  // TODO Refactor this state away!
  // -------------------------------------------------------------------------
  // Tricky case! This state is used after the node is detached from its
  // parent, but we still need to retain the parent key that it was originally
  // attached under. For example we rely on this to derive the reverse Op to
  // add. We should be able to get rid of this case by structuring the code
  // differently!
  | Orphaned;

export abstract class AbstractCrdt {
  //                  ^^^^^^^^^^^^ TODO: Make this an interface
  #pool?: ManagedPool;
  #id?: string;

  #parent: ParentInfo = NoParent;

  /** @internal */
  _getParentKeyOrThrow(): string {
    switch (this.parent.type) {
      case "HasParent":
        return this.parent.key;

      case "NoParent":
        throw new Error("Parent key is missing");

      case "Orphaned":
        return this.parent.oldKey;

      default:
        return assertNever(this.parent, "Unknown state");
    }
  }

  /** @internal */
  get _parentPos(): Pos {
    switch (this.parent.type) {
      case "HasParent":
        return this.parent.pos;

      case "NoParent":
        throw new Error("Parent key is missing");

      case "Orphaned":
        return this.parent.oldPos;

      default:
        return assertNever(this.parent, "Unknown state");
    }
  }

  /** @internal */
  protected get _pool(): ManagedPool | undefined {
    return this.#pool;
  }

  get roomId(): string | null {
    return this.#pool ? this.#pool.roomId : null;
  }

  /** @internal */
  get _id(): string | undefined {
    return this.#id;
  }

  /** @internal */
  get parent(): ParentInfo {
    return this.#parent;
  }

  /** @internal */
  get _parentKey(): string | null {
    switch (this.parent.type) {
      case "HasParent":
        return this.parent.key;

      case "NoParent":
        return null;

      case "Orphaned":
        return this.parent.oldKey;

      default:
        return assertNever(this.parent, "Unknown state");
    }
  }

  /** @internal */
  _apply(op: Op, _isLocal: boolean): ApplyResult {
    switch (op.type) {
      case OpCode.DELETE_CRDT: {
        if (this.parent.type === "HasParent") {
          return this.parent.node._detachChild(crdtAsLiveNode(this));
        }

        return { modified: false };
      }
    }

    return { modified: false };
  }

  /** @internal */
  _setParentLink(newParentNode: LiveNode, newParentKey: string): void {
    switch (this.parent.type) {
      case "HasParent":
        if (this.parent.node !== newParentNode) {
          throw new Error("Cannot set parent: node already has a parent");
        } else {
          // Ignore
          this.#parent = HasParent(newParentNode, newParentKey);
          return;
        }

      case "Orphaned":
      case "NoParent": {
        this.#parent = HasParent(newParentNode, newParentKey);
        return;
      }

      default:
        return assertNever(this.parent, "Unknown state");
    }
  }

  /** @internal */
  _attach(id: string, pool: ManagedPool): void {
    if (this.#id || this.#pool) {
      throw new Error("Cannot attach node: already attached");
    }

    pool.addNode(id, crdtAsLiveNode(this));

    this.#id = id;
    this.#pool = pool;
  }

  /** @internal */
  abstract _attachChild(op: CreateOp, source: OpSource): ApplyResult;

  /** @internal */
  _detach(): void {
    if (this.#pool && this.#id) {
      this.#pool.deleteNode(this.#id);
    }

    switch (this.parent.type) {
      case "HasParent": {
        this.#parent = Orphaned(this.parent.key, this.parent.pos);
        break;
      }

      case "NoParent": {
        this.#parent = NoParent;
        break;
      }

      case "Orphaned": {
        // No change needed
        break;
      }

      default:
        assertNever(this.parent, "Unknown state");
    }

    this.#pool = undefined;
  }

  /** @internal */
  abstract _detachChild(crdt: LiveNode): ApplyResult;

  /** @internal */
  abstract _toOps(
    parentId: string,
    parentKey: string,
    pool?: ManagedPool
  ): CreateOp[];

  /** @internal */
  abstract _serialize(): SerializedCrdt;

  /** This caches the result of the last .toImmutable() call for this Live node. */
  #cachedImmutable?: Immutable;

  #cachedTreeNodeKey?: string | number;
  /** This caches the result of the last .toTreeNode() call for this Live node. */
  #cachedTreeNode?: DevTools.LsonTreeNode;

  /**
   * @internal
   *
   * Clear the Immutable cache, so that the next call to `.toImmutable()` will
   * recompute the equivalent Immutable value again.  Call this after every
   * mutation to the Live node.
   */
  invalidate(): void {
    if (
      this.#cachedImmutable !== undefined ||
      this.#cachedTreeNode !== undefined
    ) {
      this.#cachedImmutable = undefined;
      this.#cachedTreeNode = undefined;

      if (this.parent.type === "HasParent") {
        this.parent.node.invalidate();
      }
    }
  }

  /** @internal */
  abstract _toTreeNode(key: string): DevTools.LsonTreeNode;

  /**
   * @internal
   *
   * Return an snapshot of this Live tree for use in DevTools.
   */
  toTreeNode(key: string): DevTools.LsonTreeNode {
    if (this.#cachedTreeNode === undefined || this.#cachedTreeNodeKey !== key) {
      this.#cachedTreeNodeKey = key;
      this.#cachedTreeNode = this._toTreeNode(key);
    }

    // Return cached version
    return this.#cachedTreeNode;
  }

  /** @internal */
  abstract _toImmutable(): Immutable;

  /**
   * Return an immutable snapshot of this Live node and its children.
   */
  toImmutable(): Immutable {
    if (this.#cachedImmutable === undefined) {
      this.#cachedImmutable = this._toImmutable();
    }

    // Return cached version
    return this.#cachedImmutable;
  }

  /**
   * Returns a deep clone of the current LiveStructure, suitable for insertion
   * in the tree elsewhere.
   */
  abstract clone(): Lson;
}
