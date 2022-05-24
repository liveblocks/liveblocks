import type {
  CreateChildOp,
  LiveNode,
  Op,
  SerializedCrdt,
  StorageUpdate,
} from "./types";
import { OpCode } from "./types";

export type ApplyResult =
  | { reverse: Op[]; modified: StorageUpdate }
  | { modified: false };

export interface Doc {
  //             ^^^ FIXME: Find a better name for "Doc". This is more or less
  //                        the "RoomContext".
  roomId: string;
  generateId: () => string;
  generateOpId: () => string;
  getItem: (id: string) => LiveNode | undefined;
  addItem: (id: string, liveItem: LiveNode) => void;
  deleteItem: (id: string) => void;

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

/**
 * Represents the possible states of the parent field pointers.
 */
type ParentInfo =
  // Both the parent node and the parent key are set. This is a normal child.
  | {
      readonly node: LiveNode;
      readonly key: string;
    }

  // Neither are set. This is the root node.
  | {
      readonly node: null;
      readonly key: null;
    }

  // -------------------------------------------------------------------------
  // TODO Refactor this state away!
  // -------------------------------------------------------------------------
  // Tricky case! This state is used after the node is detached from its
  // parent, but we still need to retain the parent key that it was originally
  // attached under. For example we rely on this to derive the reverse Op to
  // add. We should be able to get rid of this case by structuring the code
  // differently!
  | {
      readonly node: null;
      readonly key: string;
    };

export abstract class AbstractCrdt {
  //                  ^^^^^^^^^^^^ TODO: Make this an interface
  private __doc?: Doc;
  private __id?: string;

  private __parentInfo: ParentInfo = { node: null, key: null };

  /**
   * @internal
   */
  _getParentKeyOrThrow(): string {
    const key = this._parentKey;
    if (key === null) {
      throw new Error("Parent key is missing");
    }
    return key;
  }

  /**
   * @internal
   */
  protected get _doc(): Doc | undefined {
    return this.__doc;
  }

  get roomId(): string | null {
    return this.__doc ? this.__doc.roomId : null;
  }

  /**
   * @internal
   */
  get _id(): string | undefined {
    return this.__id;
  }

  /**
   * @internal
   */
  get _parentInfo(): ParentInfo {
    return this.__parentInfo;
  }

  /**
   * @internal
   */
  get _parent(): LiveNode | null {
    return this.__parentInfo?.node ?? null;
  }

  /**
   * @internal
   */
  get _parentKey(): string | null {
    return this.__parentInfo?.key ?? null;
  }

  /**
   * @internal
   */
  _apply(op: Op, _isLocal: boolean): ApplyResult {
    switch (op.type) {
      case OpCode.DELETE_CRDT: {
        if (this._parent != null && this._parentKey != null) {
          return this._parent._detachChild(crdtAsLiveNode(this));
        }

        return { modified: false };
      }
    }

    return { modified: false };
  }

  /**
   * @internal
   */
  _setParentLink(parent: LiveNode, key: string): void {
    if (this.__parentInfo?.node != null && this.__parentInfo.node !== parent) {
      throw new Error("Cannot attach parent if it already exist");
    }

    this.__parentInfo = {
      node: crdtAsLiveNode(parent),
      key,
    };
  }

  /**
   * @internal
   */
  _attach(id: string, doc: Doc): void {
    if (this.__id || this.__doc) {
      throw new Error("Cannot attach if CRDT is already attached");
    }

    doc.addItem(id, crdtAsLiveNode(this));

    this.__id = id;
    this.__doc = doc;
  }

  /**
   * @internal
   */
  abstract _attachChild(op: CreateChildOp, source: OpSource): ApplyResult;

  /**
   * @internal
   */
  _detach(): void {
    if (this.__doc && this.__id) {
      this.__doc.deleteItem(this.__id);
    }

    // NOTE: Ideally, we should be able to set `this.__parentInfo = undefined`
    // here, but for now we'll need to retain the last known parent key as
    // a kind of memento :(
    this.__parentInfo = this.__parentInfo?.key
      ? // Memento state! Detach from the node, but remember the key!
        // TODO: Get rid of this case
        {
          node: null,
          key: this.__parentInfo.key,
        }
      : {
          node: null,
          key: null,
        };
    this.__doc = undefined;
  }

  /**
   * @internal
   */
  abstract _detachChild(crdt: LiveNode): ApplyResult;
  /**
   * @internal
   */
  abstract _serialize(parentId: string, parentKey: string, doc?: Doc): Op[];

  /**
   * @internal
   */
  abstract _toSerializedCrdt(): SerializedCrdt;
}
