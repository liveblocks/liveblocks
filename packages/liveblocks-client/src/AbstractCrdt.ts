import { assertNever } from "./assert";
import type {
  CreateChildOp,
  LiveNode,
  Op,
  SerializedCrdt,
  StorageUpdate,
} from "./types";
import { OpCode } from "./types";
import type { Immutable } from "./types/Immutable";

export type ApplyResult =
  | { reverse: Op[]; modified: StorageUpdate }
  | { modified: false };

/**
 * The managed pool is a namespace registry (i.e. a context) that "owns" all
 * the individual live nodes, ensuring each one has a unique ID, and holding on
 * to live nodes before and after they are inter-connected.
 */
export interface ManagedPool {
  roomId: string;
  generateId: () => string;
  generateOpId: () => string;

  getNode: (id: string) => LiveNode | undefined;
  addNode: (id: string, node: LiveNode) => void;
  deleteNode: (id: string) => void;

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
}

export enum OpSource {
  UNDOREDO_RECONNECT,
  REMOTE,
  ACK,
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
};

type NoParent = {
  readonly type: "NoParent";
};

type Orphaned = {
  readonly type: "Orphaned";
  readonly oldKey: string;
};

function HasParent(node: LiveNode, key: string): HasParent {
  return Object.freeze({ type: "HasParent", node, key });
}

const NoParent: NoParent = Object.freeze({ type: "NoParent" });

function Orphaned(oldKey: string): Orphaned {
  return Object.freeze({ type: "Orphaned", oldKey });
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
  /** @internal */
  private __pool?: ManagedPool;
  /** @internal */
  private __id?: string;

  /** @internal */
  private _parent: ParentInfo = NoParent;

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
  protected get _pool(): ManagedPool | undefined {
    return this.__pool;
  }

  get roomId(): string | null {
    return this.__pool ? this.__pool.roomId : null;
  }

  /** @internal */
  get _id(): string | undefined {
    return this.__id;
  }

  /** @internal */
  get parent(): ParentInfo {
    return this._parent;
  }

  /** @internal */
  get _parentNode(): LiveNode | null {
    switch (this.parent.type) {
      case "HasParent":
        return this.parent.node;

      case "NoParent":
        return null;

      case "Orphaned":
        return null;

      default:
        return assertNever(this.parent, "Unknown state");
    }
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
          throw new Error("Cannot attach parent if it already exist");
        } else {
          // Ignore
          this._parent = HasParent(newParentNode, newParentKey);
          return;
        }

      case "Orphaned":
      case "NoParent": {
        this._parent = HasParent(newParentNode, newParentKey);
        return;
      }

      default:
        return assertNever(this.parent, "Unknown state");
    }
  }

  /** @internal */
  _attach(id: string, pool: ManagedPool): void {
    if (this.__id || this.__pool) {
      throw new Error("Cannot attach if CRDT is already attached");
    }

    pool.addNode(id, crdtAsLiveNode(this));

    this.__id = id;
    this.__pool = pool;
  }

  /** @internal */
  abstract _attachChild(op: CreateChildOp, source: OpSource): ApplyResult;

  /** @internal */
  _detach(): void {
    if (this.__pool && this.__id) {
      this.__pool.deleteNode(this.__id);
    }

    switch (this.parent.type) {
      case "HasParent": {
        this._parent = Orphaned(this.parent.key);
        break;
      }

      case "NoParent": {
        // throw new Error("Node is already detached. Cannot detach twice.");
        this._parent = NoParent;
        break;
      }

      case "Orphaned": {
        // throw new Error("Node is already detached. Cannot detach twice.");
        this._parent = Orphaned(this.parent.oldKey);
        break;
      }

      default:
        assertNever(this.parent, "Unknown state");
    }

    this.__pool = undefined;
  }

  /** @internal */
  abstract _detachChild(crdt: LiveNode): ApplyResult;

  /** @internal */
  abstract _toOps(
    parentId: string,
    parentKey: string,
    pool?: ManagedPool
  ): CreateChildOp[];

  /** @internal */
  abstract _toSerializedCrdt(): SerializedCrdt;

  /**
   * @internal
   *
   * This caches the result of the last .toImmutable() call for any Live node.
   */
  private _cachedImmutable?: Immutable;

  /**
   * @internal
   *
   * Clear the Immutable cache, so that the next call to `.toImmutable()` will
   * recompute the equivalent Immutable value again.  Call this after every
   * mutation to the Live node.
   */
  invalidate(): void {
    if (this._cachedImmutable !== undefined) {
      this._cachedImmutable = undefined;

      if (this.parent.type === "HasParent") {
        this.parent.node.invalidate();
      }
    }
  }

  /** @internal */
  abstract _toImmutable(): Immutable;

  /**
   * Return an immutable snapshot of this Live node and its children.
   */
  toImmutable(): Immutable {
    if (this._cachedImmutable === undefined) {
      this._cachedImmutable = this._toImmutable();
    }

    // Return cached version
    return this._cachedImmutable;
  }
}
