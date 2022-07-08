import type { ApplyResult, Doc } from "./AbstractCrdt";
import { AbstractCrdt } from "./AbstractCrdt";
import { nn } from "./assert";
import type {
  CreateChildOp,
  CreateRegisterOp,
  IdTuple,
  Json,
  LiveNode,
  Op,
  ParentToChildNodeMap,
  SerializedRegister,
} from "./types";
import { CrdtType, OpCode } from "./types";

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
    doc: Doc
  ): LiveRegister<Json> {
    const register = new LiveRegister(item.data);
    register._attach(id, doc);
    return register;
  }

  /** @internal */
  _serialize(
    parentId: string,
    parentKey: string,
    doc?: Doc
  ): CreateRegisterOp[] {
    if (this._id == null || parentId == null || parentKey == null) {
      throw new Error(
        "Cannot serialize register if parentId or parentKey is undefined"
      );
    }

    return [
      {
        type: OpCode.CREATE_REGISTER,
        opId: doc?.generateOpId(),
        id: this._id,
        parentId,
        parentKey,
        data: this.data,
      },
    ];
  }

  /** @internal */
  _toSerializedCrdt(): SerializedRegister {
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
  _toJson(): Json {
    return this._data;
  }
}
