import { Op, OpType, SerializedCrdt } from "./live";
import { StorageUpdate } from "./types";

export type ApplyResult =
  | { reverse: Op[]; modified: StorageUpdate }
  | { modified: false };

export interface Doc {
  roomId: string;
  generateId: () => string;
  generateOpId: () => string;
  getItem: (id: string) => AbstractCrdt | undefined;
  addItem: (id: string, item: AbstractCrdt) => void;
  deleteItem: (id: string) => void;
  dispatch: (
    ops: Op[],
    reverseOps: Op[],
    storageUpdates: Map<string, StorageUpdate>
  ) => void;
}

export abstract class AbstractCrdt {
  #parent?: AbstractCrdt;
  #doc?: Doc;
  #id?: string;
  #parentKey?: string;

  /**
   * @internal
   */
  protected get _doc() {
    return this.#doc;
  }

  get roomId() {
    return this.#doc ? this.#doc.roomId : null;
  }

  /**
   * @internal
   */
  get _id() {
    return this.#id;
  }

  /**
   * @internal
   */
  get _parent() {
    return this.#parent;
  }

  /**
   * @internal
   */
  get _parentKey() {
    return this.#parentKey;
  }

  /**
   * @internal
   */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    switch (op.type) {
      case OpType.DeleteCrdt: {
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
    if (this.#parent != null && this.#parent !== parent) {
      throw new Error("Cannot attach parent if it already exist");
    }

    this.#parentKey = key;
    this.#parent = parent;
  }

  /**
   * @internal
   */
  _attach(id: string, doc: Doc) {
    if (this.#id || this.#doc) {
      throw new Error("Cannot attach if CRDT is already attached");
    }

    doc.addItem(id, this);

    this.#id = id;
    this.#doc = doc;
  }

  /**
   * @internal
   */
  abstract _attachChild(
    id: string,
    key: string,
    crdt: AbstractCrdt,
    opId: string,
    isLocal: boolean
  ): ApplyResult;

  /**
   * @internal
   */
  _detach() {
    if (this.#doc && this.#id) {
      this.#doc.deleteItem(this.#id);
    }

    this.#parent = undefined;
    this.#doc = undefined;
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
