import { AbstractCrdt, Doc, ApplyResult } from "./AbstractCrdt";
import { deserialize, isCrdt } from "./utils";
import {
  CrdtType,
  CreateObjectOp,
  DeleteObjectKeyOp,
  Op,
  OpType,
  SerializedCrdt,
  SerializedCrdtWithId,
  UpdateObjectOp,
} from "./live";
import { LiveObjectUpdateDelta, StorageUpdate } from "./types";

/**
 * The LiveObject class is similar to a JavaScript object that is synchronized on all clients.
 * Keys should be a string, and values should be serializable to JSON.
 * If multiple clients update the same property simultaneously, the last modification received by the Liveblocks servers is the winner.
 */
export class LiveObject<
  T extends Record<string, any> = Record<string, any>
> extends AbstractCrdt {
  #map: Map<string, any>;
  #propToLastUpdate: Map<string, string> = new Map<string, string>();

  constructor(object: T = {} as T) {
    super();

    for (const key in object) {
      const value = object[key] as any;
      if (value instanceof AbstractCrdt) {
        value._setParentLink(this, key);
      }
    }

    this.#map = new Map(Object.entries(object));
  }

  /**
   * @internal
   */
  _serialize(parentId?: string, parentKey?: string, doc?: Doc): Op[] {
    if (this._id == null) {
      throw new Error("Cannot serialize item is not attached");
    }

    const ops = [];
    const op: CreateObjectOp = {
      id: this._id,
      opId: doc?.generateOpId(),
      type: OpType.CreateObject,
      parentId,
      parentKey,
      data: {},
    };

    ops.push(op);

    for (const [key, value] of this.#map) {
      if (value instanceof AbstractCrdt) {
        ops.push(...value._serialize(this._id, key, doc));
      } else {
        op.data[key] = value;
      }
    }

    return ops;
  }

  /**
   * @internal
   */
  static _deserialize(
    [id, item]: SerializedCrdtWithId,
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    if (item.type !== CrdtType.Object) {
      throw new Error(
        `Tried to deserialize a record but item type is "${item.type}"`
      );
    }

    const object = new LiveObject(item.data);
    object._attach(id, doc);

    return this._deserializeChildren(object, parentToChildren, doc);
  }

  /**
   * @internal
   */
  static _deserializeChildren(
    object: LiveObject,
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    const children = parentToChildren.get(object._id!);

    if (children == null) {
      return object;
    }

    for (const entry of children) {
      const crdt = entry[1];
      if (crdt.parentKey == null) {
        throw new Error(
          "Tried to deserialize a crdt but it does not have a parentKey and is not the root"
        );
      }

      const child = deserialize(entry, parentToChildren, doc);
      child._setParentLink(object, crdt.parentKey);
      object.#map.set(crdt.parentKey, child);
    }

    return object;
  }

  /**
   * @internal
   */
  _attach(id: string, doc: Doc) {
    super._attach(id, doc);

    for (const [key, value] of this.#map) {
      if (value instanceof AbstractCrdt) {
        value._attach(doc.generateId(), doc);
      }
    }
  }

  /**
   * @internal
   */
  _attachChild(
    id: string,
    key: keyof T,
    child: AbstractCrdt,
    opId: string,
    isLocal: boolean
  ): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    if (this._doc.getItem(id) !== undefined) {
      if (this.#propToLastUpdate.get(key as string) === opId) {
        // Acknowlegment from local operation
        this.#propToLastUpdate.delete(key as string);
      }

      return { modified: false };
    }

    if (isLocal) {
      this.#propToLastUpdate.set(key as string, opId);
    } else if (this.#propToLastUpdate.get(key as string) === undefined) {
      // Remote operation with no local change => apply operation
    } else if (this.#propToLastUpdate.get(key as string) === opId) {
      // Acknowlegment from local operation
      this.#propToLastUpdate.delete(key as string);
      return { modified: false };
    } else {
      // Conflict, ignore remote operation
      return { modified: false };
    }

    const previousValue = this.#map.get(key as string);
    let reverse: Op[];
    if (isCrdt(previousValue)) {
      reverse = previousValue._serialize(this._id!, key as string);
      previousValue._detach();
    } else if (previousValue === undefined) {
      reverse = [
        { type: OpType.DeleteObjectKey, id: this._id!, key: key as string },
      ];
    } else {
      reverse = [
        {
          type: OpType.UpdateObject,
          id: this._id!,
          data: { [key]: previousValue },
        } as any, // TODO
      ];
    }

    this.#map.set(key as string, child);
    child._setParentLink(this, key as string);
    child._attach(id, this._doc);

    return {
      reverse,
      modified: {
        node: this,
        type: "LiveObject",
        updates: { [key as string]: { type: "update" } },
      },
    };
  }

  /**
   * @internal
   */
  _detachChild(child: AbstractCrdt): ApplyResult {
    if (child) {
      const reverse = child._serialize(this._id!, child._parentKey!, this._doc);

      for (const [key, value] of this.#map) {
        if (value === child) {
          this.#map.delete(key);
        }
      }

      child._detach();

      const storageUpdate: StorageUpdate = {
        node: this as any,
        type: "LiveObject",
        updates: {
          [child._parentKey!]: { type: "delete" },
        },
      };

      return { modified: storageUpdate, reverse };
    }

    return { modified: false };
  }

  /**
   * @internal
   */
  _detachChildren() {
    for (const [key, value] of this.#map) {
      this.#map.delete(key);
      value._detach();
    }
  }

  /**
   * @internal
   */
  _detach() {
    super._detach();

    for (const value of this.#map.values()) {
      if (isCrdt(value)) {
        value._detach();
      }
    }
  }

  /**
   * @internal
   */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    if (op.type === OpType.UpdateObject) {
      return this.#applyUpdate(op, isLocal);
    } else if (op.type === OpType.DeleteObjectKey) {
      return this.#applyDeleteObjectKey(op);
    }

    return super._apply(op, isLocal);
  }

  /**
   * @internal
   */
  _toSerializedCrdt(): SerializedCrdt {
    return {
      type: CrdtType.Object,
      parentId: this._parent?._id,
      parentKey: this._parentKey,
      data: this.toObject(),
    };
  }

  #applyUpdate(op: UpdateObjectOp, isLocal: boolean): ApplyResult {
    let isModified = false;
    const reverse: Op[] = [];
    const reverseUpdate: UpdateObjectOp = {
      type: OpType.UpdateObject,
      id: this._id!,
      data: {},
    };
    reverse.push(reverseUpdate);

    for (const key in op.data as Partial<T>) {
      const oldValue = this.#map.get(key);
      if (oldValue instanceof AbstractCrdt) {
        reverse.push(...oldValue._serialize(this._id!, key));
        oldValue._detach();
      } else if (oldValue !== undefined) {
        reverseUpdate.data[key] = oldValue;
      } else if (oldValue === undefined) {
        reverse.push({ type: OpType.DeleteObjectKey, id: this._id!, key });
      }
    }

    const updateDelta: LiveObjectUpdateDelta<T> = {};
    for (const key in op.data as Partial<T>) {
      if (isLocal) {
        this.#propToLastUpdate.set(key, op.opId!);
      } else if (this.#propToLastUpdate.get(key) == null) {
        // Not modified localy so we apply update
        isModified = true;
      } else if (this.#propToLastUpdate.get(key) === op.opId) {
        // Acknowlegment from local operation
        this.#propToLastUpdate.delete(key);
        continue;
      } else {
        // Conflict, ignore remote operation
        continue;
      }

      const oldValue = this.#map.get(key);

      if (isCrdt(oldValue)) {
        oldValue._detach();
      }

      isModified = true;
      updateDelta[key] = { type: "update" };
      this.#map.set(key, op.data[key]);
    }

    if (Object.keys(reverseUpdate.data).length !== 0) {
      reverse.unshift(reverseUpdate);
    }

    return isModified
      ? {
          modified: {
            node: this,
            type: "LiveObject",
            updates: updateDelta,
          },
          reverse,
        }
      : { modified: false };
  }

  #applyDeleteObjectKey(op: DeleteObjectKeyOp): ApplyResult {
    const key = op.key;

    // If property does not exist, exit without notifying
    if (this.#map.has(key) === false) {
      return { modified: false };
    }

    // If a local operation exists on the same key
    // prevent flickering by not applying delete op.
    if (this.#propToLastUpdate.get(key) !== undefined) {
      return { modified: false };
    }

    const oldValue = this.#map.get(key);

    let reverse: Op[] = [];
    if (isCrdt(oldValue)) {
      reverse = oldValue._serialize(this._id!, op.key);
      oldValue._detach();
    } else if (oldValue !== undefined) {
      reverse = [
        {
          type: OpType.UpdateObject,
          id: this._id!,
          data: { [key]: oldValue },
        },
      ];
    }

    this.#map.delete(key);
    return {
      modified: {
        node: this,
        type: "LiveObject",
        updates: { [op.key]: { type: "delete" } },
      },
      reverse,
    };
  }

  /**
   * Transform the LiveObject into a javascript object
   */
  toObject(): T {
    return Object.fromEntries(this.#map) as T;
  }

  /**
   * Adds or updates a property with a specified key and a value.
   * @param key The key of the property to add
   * @param value The value of the property to add
   */
  set<TKey extends keyof T>(key: TKey, value: T[TKey]) {
    // TODO: Find out why typescript complains
    this.update({ [key]: value } as any as Partial<T>);
  }

  /**
   * Returns a specified property from the LiveObject.
   * @param key The key of the property to get
   */
  get<TKey extends keyof T>(key: TKey): T[TKey] {
    return this.#map.get(key as string);
  }

  /**
   * Deletes a key from the LiveObject
   * @param key The key of the property to delete
   */
  delete(key: keyof T): void {
    const keyAsString = key as string;
    const oldValue = this.#map.get(keyAsString);

    if (oldValue === undefined) {
      return;
    }

    if (this._doc == null || this._id == null) {
      if (oldValue instanceof AbstractCrdt) {
        oldValue._detach();
      }
      this.#map.delete(keyAsString);
      return;
    }

    let reverse: Op[];

    if (oldValue instanceof AbstractCrdt) {
      oldValue._detach();
      reverse = oldValue._serialize(this._id, keyAsString);
    } else {
      reverse = [
        {
          type: OpType.UpdateObject,
          data: { [keyAsString]: oldValue },
          id: this._id,
        },
      ];
    }

    this.#map.delete(keyAsString);

    const storageUpdates = new Map<string, StorageUpdate>();
    storageUpdates.set(this._id, {
      node: this,
      type: "LiveObject",
      updates: { [key as string]: { type: "delete" } },
    });

    this._doc.dispatch(
      [
        {
          type: OpType.DeleteObjectKey,
          key: keyAsString,
          id: this._id,
          opId: this._doc!.generateOpId(),
        },
      ],
      reverse,
      storageUpdates
    );
  }

  /**
   * Adds or updates multiple properties at once with an object.
   * @param overrides The object used to overrides properties
   */
  update(overrides: Partial<T>) {
    if (this._doc == null || this._id == null) {
      for (const key in overrides) {
        const oldValue = this.#map.get(key);

        if (oldValue instanceof AbstractCrdt) {
          oldValue._detach();
        }

        const newValue = overrides[key] as any;

        if (newValue instanceof AbstractCrdt) {
          newValue._setParentLink(this, key);
        }

        this.#map.set(key, newValue);
      }

      return;
    }

    const ops: Op[] = [];
    const reverseOps: Op[] = [];

    const opId = this._doc.generateOpId();
    const updatedProps: Partial<T> = {};

    const reverseUpdateOp: UpdateObjectOp = {
      id: this._id,
      type: OpType.UpdateObject,
      data: {},
    };

    const updateDelta: LiveObjectUpdateDelta<T> = {};

    for (const key in overrides) {
      const oldValue = this.#map.get(key);

      if (oldValue instanceof AbstractCrdt) {
        reverseOps.push(...oldValue._serialize(this._id, key));
        oldValue._detach();
      } else if (oldValue === undefined) {
        reverseOps.push({ type: OpType.DeleteObjectKey, id: this._id, key });
      } else {
        reverseUpdateOp.data[key] = oldValue;
      }

      const newValue = overrides[key] as any;

      if (newValue instanceof AbstractCrdt) {
        newValue._setParentLink(this, key);
        newValue._attach(this._doc.generateId(), this._doc);
        const newAttachChildOps = newValue._serialize(this._id, key, this._doc);

        const createCrdtOp = newAttachChildOps.find(
          (op: Op & { parentId?: string }) => op.parentId === this._id
        );
        if (createCrdtOp) {
          this.#propToLastUpdate.set(key, createCrdtOp.opId!);
        }

        ops.push(...newAttachChildOps);
      } else {
        updatedProps[key] = newValue;
        this.#propToLastUpdate.set(key, opId);
      }

      this.#map.set(key, newValue);
      updateDelta[key] = { type: "update" };
    }

    if (Object.keys(reverseUpdateOp.data).length !== 0) {
      reverseOps.unshift(reverseUpdateOp);
    }

    if (Object.keys(updatedProps).length !== 0) {
      ops.unshift({
        opId,
        id: this._id,
        type: OpType.UpdateObject,
        data: updatedProps,
      });
    }

    const storageUpdates = new Map<string, StorageUpdate>();
    storageUpdates.set(this._id, {
      node: this,
      type: "LiveObject",
      updates: updateDelta,
    });
    this._doc.dispatch(ops, reverseOps, storageUpdates);
  }
}
