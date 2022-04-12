import { AbstractCrdt, Doc, ApplyResult } from "./AbstractCrdt";
import {
  SerializedCrdtWithId,
  CrdtType,
  Op,
  OpType,
  SerializedCrdt,
} from "./live";

/**
 * @internal
 */
export class LiveRegister<TValue> extends AbstractCrdt {
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
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    if (item.type !== CrdtType.Register) {
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
  _serialize(parentId: string, parentKey: string, doc?: Doc): Op[] {
    if (this._id == null || parentId == null || parentKey == null) {
      throw new Error(
        "Cannot serialize register if parentId or parentKey is undefined"
      );
    }

    return [
      {
        type: OpType.CreateRegister,
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
  _toSerializedCrdt(): SerializedCrdt {
    return {
      type: CrdtType.Register,
      parentId: this._parent?._id!,
      parentKey: this._parentKey!,
      data: this.data,
    };
  }

  _attachChild(
    _id: string,
    _key: string,
    _crdt: AbstractCrdt,
    _opId: string,
    _isLocal: boolean
  ): ApplyResult {
    throw new Error("Method not implemented.");
  }

  _detachChild(_crdt: AbstractCrdt): ApplyResult {
    throw new Error("Method not implemented.");
  }

  _apply(op: Op, isLocal: boolean): ApplyResult {
    return super._apply(op, isLocal);
  }
}
