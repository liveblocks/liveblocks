import type { CreateChildOp, Op, SerializedCrdt, StorageUpdate } from "./types";
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
  getItem: (id: string) => AbstractCrdt | undefined;
  addItem: (id: string, item: AbstractCrdt) => void;
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

export abstract class AbstractCrdt {
  private __parent?: AbstractCrdt;
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
  protected get _doc() {
    return this.__doc;
  }

  get roomId() {
    return this.__doc ? this.__doc.roomId : null;
  }

  /**
   * @internal
   */
  get _id() {
    return this.__id;
  }

  /**
   * @internal
   */
  get _parent() {
    return this.__parent;
  }

  /**
   * @internal
   */
  get _parentKey() {
    return this.__parentKey;
  }

  /**
   * @internal
   */
  _apply(op: Op, _isLocal: boolean): ApplyResult {
    switch (op.type) {
      case OpCode.DELETE_CRDT: {
        if (this._parent != null && this._parentKey != null) {
          return this._parent._detachChild(this);
        }

        return { modified: false };
      }
    }

    return { modified: false };
  }

  /**
   * @internal
   */
  _setParentLink(parent: AbstractCrdt, key: string) {
    if (this.__parent != null && this.__parent !== parent) {
      throw new Error("Cannot attach parent if it already exist");
    }

    this.__parentKey = key;
    this.__parent = parent;
  }

  /**
   * @internal
   */
  _attach(id: string, doc: Doc) {
    if (this.__id || this.__doc) {
      throw new Error("Cannot attach if CRDT is already attached");
    }

    doc.addItem(id, this);

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
  _detach() {
    if (this.__doc && this.__id) {
      this.__doc.deleteItem(this.__id);
    }

    this.__parent = undefined;
    this.__doc = undefined;
  }

  /**
   * @internal
   */
  abstract _detachChild(crdt: AbstractCrdt): ApplyResult;
  /**
   * @internal
   */
  abstract _serialize(parentId: string, parentKey: string, doc?: Doc): Op[];

  /**
   * @internal
   */
  abstract _toSerializedCrdt(): SerializedCrdt;
}
