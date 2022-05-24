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

// XXX Temporary helper to help convert from AbstractCrdt -> LiveNode
// XXX Remove me later
// eslint-disable-next-line no-restricted-syntax
function crdtAsLiveNode(value: AbstractCrdt): LiveNode {
  return value as LiveNode;
}

export abstract class AbstractCrdt {
  //                  ^^^^^^^^^^^^ TODO: Make this an interface
  private __parent?: LiveNode;
  private __doc?: Doc;
  private __id?: string;
  private __parentKey?: string;

  /**
   * @internal
   */
  _getParentKeyOrThrow(): string {
    const key = this.__parentKey;
    if (key == null) {
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
  get _parent(): LiveNode | undefined {
    return this.__parent;
  }

  /**
   * @internal
   */
  get _parentKey(): string | undefined {
    return this.__parentKey;
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
    if (this.__parent != null && this.__parent !== parent) {
      throw new Error("Cannot attach parent if it already exist");
    }

    this.__parentKey = key;
    this.__parent = crdtAsLiveNode(parent);
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

    this.__parent = undefined;
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
