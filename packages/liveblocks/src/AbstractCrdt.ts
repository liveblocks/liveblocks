import { ApplyResult } from "./doc";
import { Op, OpType } from "./live";

export interface Doc {
  generateId: () => string;
  generateOpId: () => string;
  addItem: (id: string, item: AbstractCrdt) => void;
  deleteItem: (id: string) => void;
  dispatch: (ops: Op[], reverseOps: Op[], modified: AbstractCrdt[]) => void;
}

export abstract class AbstractCrdt {
  #parent?: AbstractCrdt;
  #doc?: Doc;
  #id?: string;
  #parentKey?: string;

  /**
   * INTERNAL
   */
  protected get _doc() {
    return this.#doc;
  }

  /**
   * INTERNAL
   */
  get _id() {
    return this.#id;
  }

  /**
   * INTERNAL
   */
  get _parent() {
    return this.#parent;
  }

  /**
   * INTERNAL
   */
  get _parentKey() {
    return this.#parentKey;
  }

  /**
   * INTERNAL
   */
  _apply(op: Op): ApplyResult {
    switch (op.type) {
      case OpType.DeleteCrdt: {
        if (this._parent != null && this._parentKey != null) {
          const reverse = this._serialize(this._parent._id!, this._parentKey);
          this._parent._detachChild(this);
          return { modified: this, reverse };
        }

        return { modified: false };
      }
    }

    return { modified: false };
  }

  /**
   * INTERNAL
   */
  _setParentLink(parent: AbstractCrdt, key: string) {
    if (this.#parent != null && this.#parent !== parent) {
      throw new Error("Cannot attach parent if it already exist");
    }

    this.#parentKey = key;
    this.#parent = parent;
  }

  /**
   * INTERNAL
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
   * INTERNAL
   */
  abstract _attachChild(
    id: string,
    key: string,
    crdt: AbstractCrdt
  ): ApplyResult;

  /**
   * INTERNAL
   */
  _detach() {
    if (this.#doc && this.#id) {
      this.#doc.deleteItem(this.#id);
    }

    this.#parent = undefined;
    this.#doc = undefined;
  }

  /**
   * INTERNAL
   */
  abstract _detachChild(crdt: AbstractCrdt): void;
  /**
   * INTERNAL
   */
  abstract _serialize(parentId: string, parentKey: string): Op[];
}
