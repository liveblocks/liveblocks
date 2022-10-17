import type { ApplyResult, ManagedPool } from "./AbstractCrdt";
import { AbstractCrdt } from "./AbstractCrdt";
import { nn } from "./lib/assert";
import type { Json, LiveNode, ParentToChildNodeMap } from "./types";
import type { Immutable } from "./types/Immutable";
import type { CreateChildOp, CreateRegisterOp, Op } from "./types/Op";
import { OpCode } from "./types/Op";
import type { IdTuple, SerializedRegister } from "./types/SerializedCrdt";
import { CrdtType } from "./types/SerializedCrdt";

/**
 * INTERNAL
 */
export class LiveRegister<TValue extends Json> extends AbstractCrdt {
  /** @internal */
  _data: TValue;

  constructor(data: TValue) {
    super();
    this._data = data;
  }

  get data(): TValue {
    return this._data;
  }

  /** @internal */
  static _deserialize(
    [id, item]: IdTuple<SerializedRegister>,
    _parentToChildren: ParentToChildNodeMap,
    pool: ManagedPool
  ): LiveRegister<Json> {
    const register = new LiveRegister(item.data);
    register._attach(id, pool);
    return register;
  }

  /** @internal */
  _toOps(
    parentId: string,
    parentKey: string,
    pool?: ManagedPool
  ): CreateRegisterOp[] {
    if (this._id === undefined) {
      throw new Error(
        "Cannot serialize register if parentId or parentKey is undefined"
      );
    }

    return [
      {
        type: OpCode.CREATE_REGISTER,
        opId: pool?.generateOpId(),
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
  _attachChild(_op: CreateChildOp): ApplyResult {
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
  _toImmutable(): Immutable {
    return this._data;
  }
}
