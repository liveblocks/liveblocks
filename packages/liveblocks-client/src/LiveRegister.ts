import type { ApplyResult, Doc } from "./AbstractCrdt";
import { AbstractCrdt } from "./AbstractCrdt";
import type {
  CreateOp,
  Json,
  Op,
  ParentToChildNodeMap,
  SerializedCrdt,
  SerializedCrdtWithId,
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
    [id, item]: SerializedCrdtWithId,
    _parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ) {
    if (item.type !== CrdtType.REGISTER) {
      throw new Error(
        `Tried to deserialize a map but item type is "${item.type}"`
      );
    }

    const register = new LiveRegister(item.data);
    register._attach(id, doc);
    return register;
  }

  /**
   * INTERNAL
   */
  _serialize(
    parentId: string,
    parentKey: string,
    doc?: Doc,
    intent?: "set"
  ): Op[] {
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
        intent,
        parentId,
        parentKey,
        data: this.data,
      },
    ];
  }

  /**
   * INTERNAL
   */
  _toSerializedCrdt(): SerializedCrdt {
    return {
      type: CrdtType.REGISTER,
      parentId: this._parent?._id!,
      parentKey: this._parentKey!,
      data: this.data,
    };
  }

  _attachChild(_op: CreateOp, _isLocal: boolean): ApplyResult {
    throw new Error("Method not implemented.");
  }

  _detachChild(_crdt: AbstractCrdt): ApplyResult {
    throw new Error("Method not implemented.");
  }

  _apply(op: Op, isLocal: boolean): ApplyResult {
    return super._apply(op, isLocal);
  }
}
