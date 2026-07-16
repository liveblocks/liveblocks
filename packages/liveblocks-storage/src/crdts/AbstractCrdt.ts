import { assertNever } from "../lib/assert";
import type { ReadonlyJson } from "../lib/Json";
import type { Pos } from "../lib/position";
import { asPos } from "../lib/position";
import type {
  ClientWireCreateOp,
  CreateOp,
  Op,
} from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { SerializedCrdt } from "../protocol/StorageNode";
import type { StorageDoc } from "../StorageDoc";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { LiveNode, Lson } from "./Lson";
import type { StorageUpdate } from "./StorageUpdates";

export type ApplyResult =
  | { reverse: Op[]; modified: StorageUpdate }
  | { modified: false };

/**
 * When applying an op to a CRDT, we need to know where it came from to apply
 * it correctly.
 */
export enum OpSource {
  /**
   * Optimistic update applied locally (from an undo, redo, or reconnect). Not
   * yet acknowledged by the remote authority.
   */
  LOCAL,

  /**
   * Op received from remote, originated from another client.
   */
  THEIRS,

  /**
   * Op received from remote, originated from THIS client (echo / ack).
   */
  OURS,
}

function crdtAsLiveNode(
  value: AbstractCrdt // eslint-disable-line no-restricted-syntax
): LiveNode {
  return value as LiveNode;
}

type HasParent = {
  readonly type: "HasParent";
  readonly node: LiveNode;
  readonly key: string;
  readonly pos: Pos;
};

type NoParent = {
  readonly type: "NoParent";
};

type Orphaned = {
  readonly type: "Orphaned";
  readonly oldKey: string;
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

type ParentInfo = HasParent | NoParent | Orphaned;

export abstract class AbstractCrdt {
  #doc?: StorageDoc;
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
  protected get _doc(): StorageDoc | undefined {
    return this.#doc;
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
  _attach(id: string, doc: StorageDoc): void {
    if (this.#id || this.#doc) {
      throw new Error("Cannot attach node: already attached");
    }

    doc.addNode(id, crdtAsLiveNode(this));

    this.#id = id;
    this.#doc = doc;
  }

  /** @internal */
  abstract _attachChild(op: CreateOp, source: OpSource): ApplyResult;

  /** @internal */
  _detach(): void {
    if (this.#doc && this.#id) {
      this.#doc.deleteNode(this.#id);
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
        break;
      }

      default:
        assertNever(this.parent, "Unknown state");
    }

    this.#doc = undefined;
  }

  /** @internal */
  abstract _detachChild(crdt: LiveNode): ApplyResult;

  /**
   * Serializes this CRDT and all its children into a list of creation ops
   * without opIds.
   *
   * @internal
   */
  abstract _toOps(parentId: string, parentKey: string): CreateOp[];

  /**
   * Serializes this CRDT and all its children into creation ops with opIds.
   *
   * @internal
   */
  _toOpsWithOpId(
    parentId: string,
    parentKey: string,
    doc: StorageDoc
  ): ClientWireCreateOp[] {
    return this._toOps(parentId, parentKey).map((op) => ({
      opId: doc.generateOpId(),
      ...op,
    }));
  }

  /** @internal */
  abstract _serialize(): SerializedCrdt;

  #cachedJson?: ReadonlyJson;

  #cachedTreeNodeKey?: string | number;
  #cachedTreeNode?: DevTools.LsonTreeNode;

  /**
   * @internal
   */
  invalidate(): void {
    if (this.#cachedJson !== undefined || this.#cachedTreeNode !== undefined) {
      this.#cachedJson = undefined;
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
   */
  toTreeNode(key: string): DevTools.LsonTreeNode {
    if (this.#cachedTreeNode === undefined || this.#cachedTreeNodeKey !== key) {
      this.#cachedTreeNodeKey = key;
      this.#cachedTreeNode = this._toTreeNode(key);
    }

    return this.#cachedTreeNode;
  }

  /** @internal */
  abstract _toJSON(): ReadonlyJson;

  /**
   * @private
   */
  hasCache(value: unknown): boolean {
    return this.#cachedJson !== undefined && this.#cachedJson === value;
  }

  toJSON(): ReadonlyJson {
    if (this.#cachedJson === undefined) {
      this.#cachedJson = this._toJSON();
    }

    return this.#cachedJson;
  }

  abstract clone(): Lson;
}
