import type { ApplyResult, Doc, OpSource } from "./AbstractCrdt";
import { AbstractCrdt } from "./AbstractCrdt";
import type {
  CreateOp,
  IdTuple,
  Json,
  Op,
  ParentToChildNodeMap,
  SerializedRegister,
} from "./types";
import { CrdtType, OpCode } from "./types";

/**
 * @internal
 */
export class LiveRegister<TValue extends Json> extends AbstractCrdt {
  _data: TValue;

  constructor(data: TValue) {
    super();
    this._data = data;
  }

  get data(): TValue {
    return this._data;
  }

  /**
   * INTERNAL
   */
  static _deserialize(
    [id, item]: IdTuple<SerializedRegister>,
    _parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ) {
    const register = new LiveRegister(item.data);
    register._attach(id, doc);
    return register;
  }

  /**
   * INTERNAL
   */
  _serialize(parentId: string, parentKey: string, doc?: Doc): Op[] {
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

  /**
   * INTERNAL
   */
  _toSerializedCrdt(): SerializedRegister {
    return {
      type: CrdtType.REGISTER,
      parentId: this._parent?._id!,
      parentKey: this._parentKey!,
      data: this.data,
    };
  }

  _attachChild(_op: CreateOp, source: OpSource): ApplyResult {
    throw new Error("Method not implemented.");
  }

  _detachChild(_crdt: AbstractCrdt): ApplyResult {
    throw new Error("Method not implemented.");
  }

  _apply(op: Op, isLocal: boolean): ApplyResult {
    return super._apply(op, isLocal);
  }
}
