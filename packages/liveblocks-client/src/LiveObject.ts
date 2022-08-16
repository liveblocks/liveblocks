import type { ApplyResult, Doc } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import { nn } from "./assert";
import { liveObjectToJson } from "./immutable";
import type {
  CreateChildOp,
  CreateObjectOp,
  CreateOp,
  CreateRootObjectOp,
  DeleteObjectKeyOp,
  IdTuple,
  Json,
  JsonObject,
  LiveNode,
  LiveObjectUpdateDelta,
  LiveObjectUpdates,
  Lson,
  LsonObject,
  Op,
  ParentToChildNodeMap,
  SerializedObject,
  SerializedRootObject,
  UpdateDelta,
  UpdateObjectOp,
} from "./types";
import { CrdtType, OpCode } from "./types";
import {
  creationOpToLson,
  deserializeToLson,
  fromEntries,
  isLiveNode,
  isLiveStructure,
} from "./utils";

/**
 * The LiveObject class is similar to a JavaScript object that is synchronized on all clients.
 * Keys should be a string, and values should be serializable to JSON.
 * If multiple clients update the same property simultaneously, the last modification received by the Liveblocks servers is the winner.
 */
export class LiveObject<O extends LsonObject> extends AbstractCrdt {
  /** @internal */
  private _map: Map<string, Lson>;

  /** @internal */
  private _propToLastUpdate: Map<string, string>;

  constructor(obj: O = {} as O) {
    super();

    this._propToLastUpdate = new Map<string, string>();

    for (const key in obj) {
      const value = obj[key];
      if (value === undefined) {
        continue;
      } else if (isLiveNode(value)) {
        value._setParentLink(this, key);
      }
    }

    this._map = new Map(Object.entries(obj)) as Map<string, Lson>;
  }

  /** @internal */
  _serialize(parentId: string, parentKey: string, doc?: Doc): CreateChildOp[];
  /** @internal */
  _serialize(
    parentId?: undefined,
    parentKey?: undefined,
    doc?: Doc
  ): CreateOp[];
  /** @internal */
  _serialize(parentId?: string, parentKey?: string, doc?: Doc): CreateOp[] {
    if (this._id == null) {
      throw new Error("Cannot serialize item is not attached");
    }

    const opId = doc?.generateOpId();

    const ops: CreateOp[] = [];
    const op: CreateObjectOp | CreateRootObjectOp =
      parentId !== undefined && parentKey !== undefined
        ? {
            type: OpCode.CREATE_OBJECT,
            id: this._id,
            opId,
            parentId,
            parentKey,
            data: {},
          }
        : // Root object
          { type: OpCode.CREATE_OBJECT, id: this._id, opId, data: {} };

    ops.push(op);

    for (const [key, value] of this._map) {
      if (isLiveNode(value)) {
        ops.push(...value._serialize(this._id, key, doc));
      } else {
        op.data[key] = value;
      }
    }

    return ops;
  }

  /** @internal */
  static _deserialize(
    [id, item]: IdTuple<SerializedObject | SerializedRootObject>,
    parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ): LiveObject<LsonObject> {
    const liveObj = new LiveObject(item.data);
    liveObj._attach(id, doc);
    return this._deserializeChildren(liveObj, parentToChildren, doc);
  }

  /** @internal */
  static _deserializeChildren(
    liveObj: LiveObject<JsonObject>,
    parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ): LiveObject<LsonObject> {
    const children = parentToChildren.get(nn(liveObj._id));

    if (children == null) {
      return liveObj;
    }

    for (const [id, crdt] of children) {
      const child = deserializeToLson([id, crdt], parentToChildren, doc);
      if (isLiveStructure(child)) {
        child._setParentLink(liveObj, crdt.parentKey);
      }
      liveObj._map.set(crdt.parentKey, child);
      liveObj.invalidate();
    }

    return liveObj;
  }

  /** @internal */
  _attach(id: string, doc: Doc): void {
    super._attach(id, doc);

    for (const [_key, value] of this._map) {
      if (isLiveNode(value)) {
        value._attach(doc.generateId(), doc);
      }
    }
  }

  /** @internal */
  _attachChild(op: CreateChildOp, source: OpSource): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const { id, opId, parentKey: key } = op;
    const child = creationOpToLson(op);

    if (this._doc.getItem(id) !== undefined) {
      if (this._propToLastUpdate.get(key) === opId) {
        // Acknowlegment from local operation
        this._propToLastUpdate.delete(key);
      }

      return { modified: false };
    }

    if (source === OpSource.UNDOREDO_RECONNECT) {
      this._propToLastUpdate.set(key, nn(opId));
    } else if (this._propToLastUpdate.get(key) === undefined) {
      // Remote operation with no local change => apply operation
    } else if (this._propToLastUpdate.get(key) === opId) {
      // Acknowlegment from local operation
      this._propToLastUpdate.delete(key);
      return { modified: false };
    } else {
      // Conflict, ignore remote operation
      return { modified: false };
    }

    const thisId = nn(this._id);
    const previousValue = this._map.get(key);
    let reverse: Op[];
    if (isLiveNode(previousValue)) {
      reverse = previousValue._serialize(thisId, key);
      previousValue._detach();
    } else if (previousValue === undefined) {
      reverse = [{ type: OpCode.DELETE_OBJECT_KEY, id: thisId, key }];
    } else {
      reverse = [
        {
          type: OpCode.UPDATE_OBJECT,
          id: thisId,
          data: { [key]: previousValue },
        },
      ];
    }

    this._map.set(key, child);
    this.invalidate();

    if (isLiveStructure(child)) {
      child._setParentLink(this, key);
      child._attach(id, this._doc);
    }

    return {
      reverse,
      modified: {
        node: this,
        type: "LiveObject",
        updates: { [key]: { type: "update" } },
      },
    };
  }

  /** @internal */
  _detachChild(child: LiveNode): ApplyResult {
    if (child) {
      const id = nn(this._id);
      const parentKey = nn(child._parentKey);
      const reverse = child._serialize(id, parentKey, this._doc);

      for (const [key, value] of this._map) {
        if (value === child) {
          this._map.delete(key);
          this.invalidate();
        }
      }

      child._detach();

      const storageUpdate: LiveObjectUpdates<O> = {
        node: this,
        type: "LiveObject",
        updates: {
          [parentKey]: { type: "delete" },
        } as { [K in keyof O]: UpdateDelta },
      };

      return { modified: storageUpdate, reverse };
    }

    return { modified: false };
  }

  /**
   * @internal
   */
  _detach(): void {
    super._detach();

    for (const value of this._map.values()) {
      if (isLiveNode(value)) {
        value._detach();
      }
    }
  }

  /** @internal */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    if (op.type === OpCode.UPDATE_OBJECT) {
      return this._applyUpdate(op, isLocal);
    } else if (op.type === OpCode.DELETE_OBJECT_KEY) {
      return this._applyDeleteObjectKey(op);
    }

    return super._apply(op, isLocal);
  }

  /**
   * @internal
   */
  _toSerializedCrdt(): SerializedObject | SerializedRootObject {
    const data: JsonObject = {};

    // Add only the static Json data fields into the objects
    for (const [key, value] of this._map) {
      if (!isLiveNode(value)) {
        data[key] = value;
      }
    }

    if (this.parent.type === "HasParent" && this.parent.node._id) {
      return {
        type: CrdtType.OBJECT,
        parentId: this.parent.node._id,
        parentKey: this.parent.key,
        data,
      };
    } else {
      // Root object has no parent ID/key
      return {
        type: CrdtType.OBJECT,
        data,
      };
    }
  }

  /** @internal */
  private _applyUpdate(op: UpdateObjectOp, isLocal: boolean): ApplyResult {
    let isModified = false;
    const id = nn(this._id);
    const reverse: Op[] = [];
    const reverseUpdate: UpdateObjectOp = {
      type: OpCode.UPDATE_OBJECT,
      id,
      data: {},
    };
    reverse.push(reverseUpdate);

    for (const key in op.data as Partial<O>) {
      const oldValue = this._map.get(key);
      if (isLiveNode(oldValue)) {
        reverse.push(...oldValue._serialize(id, key));
        oldValue._detach();
      } else if (oldValue !== undefined) {
        reverseUpdate.data[key] = oldValue;
      } else if (oldValue === undefined) {
        reverse.push({ type: OpCode.DELETE_OBJECT_KEY, id, key });
      }
    }

    const updateDelta: LiveObjectUpdateDelta<O> = {};
    for (const key in op.data as Partial<O>) {
      const value = op.data[key];
      if (value === undefined) {
        continue;
      }

      if (isLocal) {
        this._propToLastUpdate.set(key, nn(op.opId));
      } else if (this._propToLastUpdate.get(key) == null) {
        // Not modified localy so we apply update
        isModified = true;
      } else if (this._propToLastUpdate.get(key) === op.opId) {
        // Acknowlegment from local operation
        this._propToLastUpdate.delete(key);
        continue;
      } else {
        // Conflict, ignore remote operation
        continue;
      }

      const oldValue = this._map.get(key);

      if (isLiveNode(oldValue)) {
        oldValue._detach();
      }

      isModified = true;
      updateDelta[key] = { type: "update" };
      this._map.set(key, value);
      this.invalidate();
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

  /** @internal */
  private _applyDeleteObjectKey(op: DeleteObjectKeyOp): ApplyResult {
    const key = op.key;

    // If property does not exist, exit without notifying
    if (this._map.has(key) === false) {
      return { modified: false };
    }

    // If a local operation exists on the same key
    // prevent flickering by not applying delete op.
    if (this._propToLastUpdate.get(key) !== undefined) {
      return { modified: false };
    }

    const oldValue = this._map.get(key);

    const id = nn(this._id);
    let reverse: Op[] = [];
    if (isLiveNode(oldValue)) {
      reverse = oldValue._serialize(id, op.key);
      oldValue._detach();
    } else if (oldValue !== undefined) {
      reverse = [
        {
          type: OpCode.UPDATE_OBJECT,
          id,
          data: { [key]: oldValue },
        },
      ];
    }

    this._map.delete(key);
    this.invalidate();
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
  toObject(): O {
    return fromEntries(this._map) as O;
  }

  /**
   * Adds or updates a property with a specified key and a value.
   * @param key The key of the property to add
   * @param value The value of the property to add
   */
  set<TKey extends keyof O>(key: TKey, value: O[TKey]): void {
    // TODO: Find out why typescript complains
    this.update({ [key]: value } as unknown as Partial<O>);
  }

  /**
   * Returns a specified property from the LiveObject.
   * @param key The key of the property to get
   */
  get<TKey extends keyof O>(key: TKey): O[TKey] {
    return this._map.get(key as string) as O[TKey];
  }

  /**
   * Deletes a key from the LiveObject
   * @param key The key of the property to delete
   */
  delete(key: keyof O): void {
    const keyAsString = key as string;
    const oldValue = this._map.get(keyAsString);

    if (oldValue === undefined) {
      return;
    }

    if (this._doc == null || this._id == null) {
      if (isLiveNode(oldValue)) {
        oldValue._detach();
      }
      this._map.delete(keyAsString);
      this.invalidate();
      return;
    }

    let reverse: Op[];

    if (isLiveNode(oldValue)) {
      oldValue._detach();
      reverse = oldValue._serialize(this._id, keyAsString);
    } else {
      reverse = [
        {
          type: OpCode.UPDATE_OBJECT,
          data: { [keyAsString]: oldValue },
          id: this._id,
        },
      ];
    }

    this._map.delete(keyAsString);
    this.invalidate();

    const storageUpdates = new Map<string, LiveObjectUpdates<O>>();
    storageUpdates.set(this._id, {
      node: this,
      type: "LiveObject",
      updates: { [key]: { type: "delete" } } as {
        [K in keyof O]: UpdateDelta;
      },
    });

    this._doc.dispatch(
      [
        {
          type: OpCode.DELETE_OBJECT_KEY,
          key: keyAsString,
          id: this._id,
          opId: this._doc.generateOpId(),
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
  update(overrides: Partial<O>): void {
    if (this._doc == null || this._id == null) {
      for (const key in overrides) {
        const newValue = overrides[key];
        if (newValue === undefined) {
          continue;
        }

        const oldValue = this._map.get(key);
        if (isLiveNode(oldValue)) {
          oldValue._detach();
        }

        if (isLiveNode(newValue)) {
          newValue._setParentLink(this, key);
        }

        this._map.set(key, newValue);
        this.invalidate();
      }

      return;
    }

    const ops: Op[] = [];
    const reverseOps: Op[] = [];

    const opId = this._doc.generateOpId();
    const updatedProps: JsonObject = {};

    const reverseUpdateOp: UpdateObjectOp = {
      id: this._id,
      type: OpCode.UPDATE_OBJECT,
      data: {},
    };

    const updateDelta: LiveObjectUpdateDelta<O> = {};

    for (const key in overrides) {
      const newValue: Lson | undefined = overrides[key];
      if (newValue === undefined) {
        continue;
      }

      const oldValue = this._map.get(key);

      if (isLiveNode(oldValue)) {
        reverseOps.push(...oldValue._serialize(this._id, key));
        oldValue._detach();
      } else if (oldValue === undefined) {
        reverseOps.push({ type: OpCode.DELETE_OBJECT_KEY, id: this._id, key });
      } else {
        reverseUpdateOp.data[key] = oldValue;
      }

      if (isLiveNode(newValue)) {
        newValue._setParentLink(this, key);
        newValue._attach(this._doc.generateId(), this._doc);
        const newAttachChildOps = newValue._serialize(this._id, key, this._doc);

        const createCrdtOp = newAttachChildOps.find(
          (op: Op & { parentId?: string }) => op.parentId === this._id
        );
        if (createCrdtOp) {
          this._propToLastUpdate.set(key, nn(createCrdtOp.opId));
        }

        ops.push(...newAttachChildOps);
      } else {
        updatedProps[key] = newValue;
        this._propToLastUpdate.set(key, opId);
      }

      this._map.set(key, newValue);
      this.invalidate();
      updateDelta[key] = { type: "update" };
    }

    if (Object.keys(reverseUpdateOp.data).length !== 0) {
      reverseOps.unshift(reverseUpdateOp);
    }

    if (Object.keys(updatedProps).length !== 0) {
      ops.unshift({
        opId,
        id: this._id,
        type: OpCode.UPDATE_OBJECT,
        data: updatedProps,
      });
    }

    const storageUpdates = new Map<string, LiveObjectUpdates<O>>();
    storageUpdates.set(this._id, {
      node: this,
      type: "LiveObject",
      updates: updateDelta,
    });
    this._doc.dispatch(ops, reverseOps, storageUpdates);
  }

  /** @internal */
  _toJson(): { [K in keyof O]: Json } {
    return liveObjectToJson(this);
  }
}
