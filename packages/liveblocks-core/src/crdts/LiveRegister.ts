import type { LiveNode } from "../crdts/Lson";
import { nn } from "../lib/assert";
import type { Json } from "../lib/Json";
import { nanoid } from "../lib/nanoid";
import { deepClone } from "../lib/utils";
import type { CreateOp, CreateRegisterOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type {
  RegisterStorageNode,
  SerializedRegister,
} from "../protocol/StorageNode";
import { CrdtType } from "../protocol/StorageNode";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { Immutable } from "../types/Immutable";
import type { ParentToChildNodeMap } from "../types/NodeMap";
import type { ApplyResult, ManagedPool } from "./AbstractCrdt";
import { AbstractCrdt } from "./AbstractCrdt";

/**
 * INTERNAL
 */
export class LiveRegister<TValue extends Json> extends AbstractCrdt {
  #data: TValue;

  constructor(data: TValue) {
    super();
    this.#data = data;
  }

  get data(): TValue {
    return this.#data;
  }

  /** @internal */
  static _deserialize(
    [id, item]: RegisterStorageNode,
    _parentToChildren: ParentToChildNodeMap,
    pool: ManagedPool
  ): LiveRegister<Json> {
    const register = new LiveRegister(item.data);
    register._attach(id, pool);
    return register;
  }

  /** @internal */
  _toOps(parentId: string, parentKey: string): CreateRegisterOp[] {
    if (this._id === undefined) {
      throw new Error(
        "Cannot serialize register if parentId or parentKey is undefined"
      );
    }

    return [
      {
        type: OpCode.CREATE_REGISTER,
        id: this._id,
        parentId,
        parentKey,
        data: this.data,
      },
    ];
  }

  /** @internal */
  _serialize(): SerializedRegister {
    if (this.parent.type !== "HasParent") {
      throw new Error("Cannot serialize LiveRegister if parent is missing");
    }

    return {
      type: CrdtType.REGISTER,
      parentId: nn(this.parent.node._id, "Parent node expected to have ID"),
      parentKey: this.parent.key,
      data: this.data,
    };
  }

  /** @internal */
  _attachChild(_op: CreateOp): ApplyResult {
    throw new Error("Method not implemented.");
  }

  /** @internal */
  _detachChild(_crdt: LiveNode): ApplyResult {
    throw new Error("Method not implemented.");
  }

  /** @internal */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    return super._apply(op, isLocal);
  }

  /** @internal */
  _toTreeNode(key: string): DevTools.LsonTreeNode {
    return {
      type: "Json",
      id: this._id ?? nanoid(),
      key,
      payload: this.#data,
    };
  }

  /** @internal */
  _toImmutable(): Immutable {
    return this.#data;
  }

  clone(): TValue {
    return deepClone(this.data);
  }
}
