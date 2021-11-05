import { AbstractCrdt, Doc } from "./AbstractCrdt";
import { ApplyResult } from "./doc";
import { SerializedCrdtWithId, CrdtType, Op, OpType } from "./live";

/**
 * INTERNAL
 */
export class LiveRegister<TValue = any> extends AbstractCrdt {
  #data: TValue;

  constructor(data: TValue) {
    super();
    this.#data = data;
  }

  get data() {
    return this.#data;
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
  _serialize(parentId: string, parentKey: string): Op[] {
    if (this._id == null || parentId == null || parentKey == null) {
      throw new Error(
        "Cannot serialize register if parentId or parentKey is undefined"
      );
    }

    return [
      {
        type: OpType.CreateRegister,
        id: this._id,
        parentId,
        parentKey,
        data: this.data,
      },
    ];
  }

  _attachChild(id: string, key: string, crdt: AbstractCrdt): ApplyResult {
    throw new Error("Method not implemented.");
  }

  _detachChild(crdt: AbstractCrdt): void {
    throw new Error("Method not implemented.");
  }

  _apply(op: Op): ApplyResult {
    return super._apply(op);
  }
}
