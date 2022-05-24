import type { ApplyResult, Doc } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import { nn } from "./assert";
import type {
  CreateChildOp,
  CreateObjectOp,
  CreateRootObjectOp,
  DeleteObjectKeyOp,
  IdTuple,
  JsonObject,
  LiveNode,
  LiveObjectUpdateDelta,
  LiveObjectUpdates,
  LsonObject,
  Op,
  ParentToChildNodeMap,
  SerializedObject,
  SerializedRootObject,
  ToJson,
  UpdateDelta,
  UpdateObjectOp,
} from "./types";
import { CrdtType, OpCode } from "./types";
import {
  creationOpToLiveNode,
  deserialize,
  fromEntries,
  isLiveNode,
} from "./utils";

/**
 * The LiveObject class is similar to a JavaScript object that is synchronized on all clients.
 * Keys should be a string, and values should be serializable to JSON.
 * If multiple clients update the same property simultaneously, the last modification received by the Liveblocks servers is the winner.
 */
export class LiveObject<O extends LsonObject> extends AbstractCrdt {
  private _map: Map<string, any>;
  private _propToLastUpdate: Map<string, string>;

  constructor(obj: O = {} as O) {
    super();

    this._propToLastUpdate = new Map<string, string>();

    for (const key in obj) {
      const value = obj[key] as any;
      if (value instanceof AbstractCrdt) {
        value._setParentLink(this, key);
      }
    }

    this._map = new Map(Object.entries(obj));
  }

  /**
   * @internal
   */
  _serialize(parentId?: string, parentKey?: string, doc?: Doc): Op[] {
    if (this._id == null) {
      throw new Error("Cannot serialize item is not attached");
    }

    const opId = doc?.generateOpId();

    const ops = [];
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
    [id, item]: IdTuple<SerializedObject | SerializedRootObject>,
    parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ): LiveObject<LsonObject> {
    const liveObj = new LiveObject(item.data);
    liveObj._attach(id, doc);
    return this._deserializeChildren(liveObj, parentToChildren, doc);
  }

  /**
   * @internal
   */
  static _deserializeChildren(
    liveObj: LiveObject<JsonObject>,
    parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ): /* FIXME: This should be something like LiveObject<JsonToLive<J>> */
  LiveObject<LsonObject> {
    const children = parentToChildren.get(nn(liveObj._id));

    if (children == null) {
      return liveObj;
    }

    for (const [id, crdt] of children) {
      const child = deserialize([id, crdt], parentToChildren, doc);
      child._setParentLink(liveObj, crdt.parentKey);
      liveObj._map.set(crdt.parentKey, child);
    }

    return liveObj;
  }

  /**
   * @internal
   */
  _attach(id: string, doc: Doc): void {
    super._attach(id, doc);

    for (const [_key, value] of this._map) {
      if (value instanceof AbstractCrdt) {
        value._attach(doc.generateId(), doc);
      }
    }
  }

  /**
   * @internal
   */
  _attachChild(op: CreateChildOp, source: OpSource): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const { id, opId, parentKey: key } = op;
    const child = creationOpToLiveNode(op);

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
    child._setParentLink(this, key);
    child._attach(id, this._doc);

    return {
      reverse,
      modified: {
        node: this,
        type: "LiveObject",
        updates: { [key]: { type: "update" } },
      },
    };
  }

  /**
   * @internal
   */
  _detachChild(child: LiveNode): ApplyResult {
    if (child) {
      const id = nn(this._id);
      const parentKey = nn(child._parentKey);
      const reverse = child._serialize(id, parentKey, this._doc);

      for (const [key, value] of this._map) {
        if (value === child) {
          this._map.delete(key);
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

  /**
   * @internal
   */
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
      if (value instanceof AbstractCrdt === false) {
        data[key] = value;
      }
    }

    if (this._parent?._id !== undefined && this._parentKey !== undefined) {
      return {
        type: CrdtType.OBJECT,
        parentId: this._parent._id,
        parentKey: this._parentKey,
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
      if (oldValue instanceof AbstractCrdt) {
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
      this._map.set(key, op.data[key]);
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
    this.update({ [key]: value } as any as Partial<O>);
  }

  /**
   * Returns a specified property from the LiveObject.
   * @param key The key of the property to get
   */
  get<TKey extends keyof O>(key: TKey): O[TKey] {
    return this._map.get(key as string);
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
      if (oldValue instanceof AbstractCrdt) {
        oldValue._detach();
      }
      this._map.delete(keyAsString);
      return;
    }

    let reverse: Op[];

    if (oldValue instanceof AbstractCrdt) {
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
        const oldValue = this._map.get(key);

        if (oldValue instanceof AbstractCrdt) {
          oldValue._detach();
        }

        const newValue = overrides[key] as any;

        if (newValue instanceof AbstractCrdt) {
          newValue._setParentLink(this, key);
        }

        this._map.set(key, newValue);
      }

      return;
    }

    const ops: Op[] = [];
    const reverseOps: Op[] = [];

    const opId = this._doc.generateOpId();
    const updatedProps: Partial<ToJson<O>> = {};

    const reverseUpdateOp: UpdateObjectOp = {
      id: this._id,
      type: OpCode.UPDATE_OBJECT,
      data: {},
    };

    const updateDelta: LiveObjectUpdateDelta<O> = {};

    for (const key in overrides) {
      const oldValue = this._map.get(key);

      if (oldValue instanceof AbstractCrdt) {
        reverseOps.push(...oldValue._serialize(this._id, key));
        oldValue._detach();
      } else if (oldValue === undefined) {
        reverseOps.push({ type: OpCode.DELETE_OBJECT_KEY, id: this._id, key });
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
          this._propToLastUpdate.set(key, nn(createCrdtOp.opId));
        }

        ops.push(...newAttachChildOps);
      } else {
        updatedProps[key] = newValue;
        this._propToLastUpdate.set(key, opId);
      }

      this._map.set(key, newValue);
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
}
