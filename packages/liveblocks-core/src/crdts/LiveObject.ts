import type { LiveNode, Lson, LsonObject } from "../crdts/Lson";
import { nn } from "../lib/assert";
import type { Json, JsonObject } from "../lib/Json";
import { nanoid } from "../lib/nanoid";
import type { RemoveUndefinedValues } from "../lib/utils";
import { compactObject, deepClone } from "../lib/utils";
import type {
  ClientWireOp,
  CreateObjectOp,
  CreateOp,
  DeleteObjectKeyOp,
  Op,
  UpdateObjectOp,
} from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type {
  IdTuple,
  SerializedChild,
  SerializedCrdt,
  SerializedObject,
  SerializedRootObject,
} from "../protocol/SerializedCrdt";
import { CrdtType } from "../protocol/SerializedCrdt";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { ParentToChildNodeMap } from "../types/NodeMap";
import type { ApplyResult, ManagedPool } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import {
  creationOpToLson,
  deserializeToLson,
  isLiveNode,
  isLiveStructure,
} from "./liveblocks-helpers";
import type { UpdateDelta } from "./UpdateDelta";
import type { ToImmutable } from "./utils";

export type LiveObjectUpdateDelta<O extends { [key: string]: unknown }> = {
  [K in keyof O]?: UpdateDelta | undefined;
};

// One key platform limit is that a LiveObject cannot exceed 128 kB when
// totalling the size of the keys and values.
// See https://liveblocks.io/docs/platform/limits#Liveblocks-Storage-limits
const MAX_LIVE_OBJECT_SIZE = 128 * 1024;

/**
 * A LiveObject notification that is sent in-client to any subscribers whenever
 * one or more of the entries inside the LiveObject instance have changed.
 */
export type LiveObjectUpdates<TData extends LsonObject> = {
  type: "LiveObject";
  node: LiveObject<TData>;
  updates: LiveObjectUpdateDelta<TData>;
};

function isRootCrdt(id: string, _: SerializedCrdt): _ is SerializedRootObject {
  return id === "root";
}

/**
 * The LiveObject class is similar to a JavaScript object that is synchronized on all clients.
 * Keys should be a string, and values should be serializable to JSON.
 * If multiple clients update the same property simultaneously, the last modification received by the Liveblocks servers is the winner.
 */
export class LiveObject<O extends LsonObject> extends AbstractCrdt {
  #map: Map<string, Lson>;

  /**
   * Tracks unacknowledged local changes per property to preserve optimistic
   * updates. Maps property keys to their pending operation IDs.
   *
   * INVARIANT: Only locally-generated opIds are ever stored here. Remote opIds
   * are only compared against (to detect ACKs), never stored.
   *
   * When a local change is made, the opId is stored here. When a remote op
   * arrives for the same key:
   * - If no entry exists → apply remote op
   * - If opId matches → it's an ACK, clear the entry
   * - If opId differs → ignore remote op to preserve optimistic update
   */
  #unackedOpsByKey: Map<string, string>;

  /**
   * Enable or disable detection of too large LiveObjects.
   * When enabled, throws an error if LiveObject static data exceeds 128KB, which
   * is the maximum value the server will be able to accept.
   * By default, this behavior is disabled to avoid the runtime performance
   * overhead on every LiveObject.set() or LiveObject.update() call.
   *
   * @experimental
   */
  public static detectLargeObjects = false;

  static #buildRootAndParentToChildren(
    items: IdTuple<SerializedCrdt>[]
  ): [root: SerializedRootObject, nodeMap: ParentToChildNodeMap] {
    const parentToChildren: ParentToChildNodeMap = new Map();
    let root: SerializedRootObject | null = null;

    for (const [id, crdt] of items) {
      if (isRootCrdt(id, crdt)) {
        root = crdt;
      } else {
        const tuple: IdTuple<SerializedChild> = [id, crdt];
        const children = parentToChildren.get(crdt.parentId);
        if (children !== undefined) {
          children.push(tuple);
        } else {
          parentToChildren.set(crdt.parentId, [tuple]);
        }
      }
    }

    if (root === null) {
      throw new Error("Root can't be null");
    }

    return [root, parentToChildren];
  }

  /** @private Do not use this API directly */
  static _fromItems<O extends LsonObject>(
    items: IdTuple<SerializedCrdt>[],
    pool: ManagedPool
  ): LiveObject<O> {
    const [root, parentToChildren] =
      LiveObject.#buildRootAndParentToChildren(items);
    return LiveObject._deserialize(
      ["root", root],
      parentToChildren,
      pool
    ) as LiveObject<O>;
  }

  constructor(obj: O = {} as O) {
    super();

    this.#unackedOpsByKey = new Map();

    const o: RemoveUndefinedValues<LsonObject> = compactObject(obj);
    for (const key of Object.keys(o)) {
      const value = o[key];
      if (isLiveNode(value)) {
        value._setParentLink(this, key);
      }
    }

    this.#map = new Map(Object.entries(o));
  }

  /** @internal */
  _toOps(parentId: string, parentKey: string): CreateOp[] {
    if (this._id === undefined) {
      throw new Error("Cannot serialize item is not attached");
    }

    const ops: CreateOp[] = [];
    const op: CreateObjectOp = {
      type: OpCode.CREATE_OBJECT,
      id: this._id,
      parentId,
      parentKey,
      data: {},
    };

    ops.push(op);

    for (const [key, value] of this.#map) {
      if (isLiveNode(value)) {
        ops.push(...value._toOps(this._id, key));
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
    pool: ManagedPool
  ): LiveObject<LsonObject> {
    const liveObj = new LiveObject(item.data);
    liveObj._attach(id, pool);
    return this._deserializeChildren(liveObj, parentToChildren, pool);
  }

  /** @internal */
  static _deserializeChildren(
    liveObj: LiveObject<JsonObject>,
    parentToChildren: ParentToChildNodeMap,
    pool: ManagedPool
  ): LiveObject<LsonObject> {
    const children = parentToChildren.get(nn(liveObj._id));
    if (children === undefined) {
      return liveObj;
    }

    for (const [id, crdt] of children) {
      const child = deserializeToLson([id, crdt], parentToChildren, pool);
      if (isLiveStructure(child)) {
        child._setParentLink(liveObj, crdt.parentKey);
      }
      liveObj.#map.set(crdt.parentKey, child);
      liveObj.invalidate();
    }

    return liveObj;
  }

  /** @internal */
  _attach(id: string, pool: ManagedPool): void {
    super._attach(id, pool);

    for (const [_key, value] of this.#map) {
      if (isLiveNode(value)) {
        value._attach(pool.generateId(), pool);
      }
    }
  }

  /** @internal */
  _attachChild(op: CreateOp, source: OpSource): ApplyResult {
    if (this._pool === undefined) {
      throw new Error("Can't attach child if managed pool is not present");
    }

    const { id, opId, parentKey: key } = op;
    const child = creationOpToLson(op);

    if (this._pool.getNode(id) !== undefined) {
      if (this.#unackedOpsByKey.get(key) === opId) {
        // Acknowlegment from local operation
        this.#unackedOpsByKey.delete(key);
      }

      return { modified: false };
    }

    if (source === OpSource.LOCAL) {
      // Track locally-generated opId to preserve optimistic update
      this.#unackedOpsByKey.set(key, nn(opId));
    } else if (this.#unackedOpsByKey.get(key) === undefined) {
      // Remote operation with no local change => apply operation
    } else if (this.#unackedOpsByKey.get(key) === opId) {
      // Acknowlegment from local operation
      this.#unackedOpsByKey.delete(key);
      return { modified: false };
    } else {
      // Conflict, ignore remote operation
      return { modified: false };
    }

    const thisId = nn(this._id);
    const previousValue = this.#map.get(key);
    let reverse: Op[];
    if (isLiveNode(previousValue)) {
      reverse = previousValue._toOps(thisId, key);
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

    this.#map.set(key, child);
    this.invalidate();

    if (isLiveStructure(child)) {
      child._setParentLink(this, key);
      child._attach(id, this._pool);
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
      const reverse = child._toOps(id, parentKey);

      for (const [key, value] of this.#map) {
        if (value === child) {
          this.#map.delete(key);
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

  /** @internal */
  _detach(): void {
    super._detach();

    for (const value of this.#map.values()) {
      if (isLiveNode(value)) {
        value._detach();
      }
    }
  }

  /** @internal */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    if (op.type === OpCode.UPDATE_OBJECT) {
      return this.#applyUpdate(op, isLocal);
    } else if (op.type === OpCode.DELETE_OBJECT_KEY) {
      return this.#applyDeleteObjectKey(op, isLocal);
    }

    return super._apply(op, isLocal);
  }

  /** @internal */
  _serialize(): SerializedObject | SerializedRootObject {
    const data: JsonObject = {};

    // Add only the static Json data fields into the objects
    for (const [key, value] of this.#map) {
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

  #applyUpdate(op: UpdateObjectOp, isLocal: boolean): ApplyResult {
    let isModified = false;
    const id = nn(this._id);
    const reverse: Op[] = [];
    const reverseUpdate: UpdateObjectOp = {
      type: OpCode.UPDATE_OBJECT,
      id,
      data: {},
    };

    for (const key in op.data as Partial<O>) {
      const oldValue = this.#map.get(key);
      if (isLiveNode(oldValue)) {
        reverse.push(...oldValue._toOps(id, key));
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
        // Track locally-generated opId to preserve optimistic update
        this.#unackedOpsByKey.set(key, nn(op.opId));
      } else if (this.#unackedOpsByKey.get(key) === undefined) {
        // Not modified localy so we apply update
        isModified = true;
      } else if (this.#unackedOpsByKey.get(key) === op.opId) {
        // Acknowlegment from local operation
        this.#unackedOpsByKey.delete(key);
        continue;
      } else {
        // Conflict, ignore remote operation
        continue;
      }

      const oldValue = this.#map.get(key);

      if (isLiveNode(oldValue)) {
        oldValue._detach();
      }

      isModified = true;
      updateDelta[key] = { type: "update" };
      this.#map.set(key, value);
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

  #applyDeleteObjectKey(op: DeleteObjectKeyOp, isLocal: boolean): ApplyResult {
    const key = op.key;

    // If property does not exist, exit without notifying
    const oldValue = this.#map.get(key);
    if (oldValue === undefined) {
      return { modified: false };
    }

    // If a local operation exists on the same key and we receive a remote
    // one prevent flickering by not applying delete op.
    if (!isLocal && this.#unackedOpsByKey.get(key) !== undefined) {
      return { modified: false };
    }

    const id = nn(this._id);
    let reverse: Op[] = [];
    if (isLiveNode(oldValue)) {
      reverse = oldValue._toOps(id, op.key);
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

    this.#map.delete(key);
    this.invalidate();
    return {
      modified: {
        node: this,
        type: "LiveObject",
        updates: {
          [op.key]: { type: "delete", deletedItem: oldValue satisfies Lson },
        },
      },
      reverse,
    };
  }

  /**
   * Transform the LiveObject into a javascript object
   */
  toObject(): O {
    return Object.fromEntries(this.#map) as O;
  }

  /**
   * Adds or updates a property with a specified key and a value.
   * @param key The key of the property to add
   * @param value The value of the property to add
   */
  set<TKey extends keyof O>(key: TKey, value: O[TKey]): void {
    // TODO: Find out why typescript complains
    this._pool?.assertStorageIsWritable();
    this.update({ [key]: value } as unknown as Partial<O>);
  }

  /**
   * Returns a specified property from the LiveObject.
   * @param key The key of the property to get
   */
  get<TKey extends keyof O>(key: TKey): O[TKey] {
    return this.#map.get(key as string) as O[TKey];
  }

  /**
   * Deletes a key from the LiveObject
   * @param key The key of the property to delete
   */
  delete(key: keyof O): void {
    this._pool?.assertStorageIsWritable();
    const keyAsString = key as string;

    const oldValue = this.#map.get(keyAsString);
    if (oldValue === undefined) {
      return;
    }

    if (this._pool === undefined || this._id === undefined) {
      if (isLiveNode(oldValue)) {
        oldValue._detach();
      }
      this.#map.delete(keyAsString);
      this.invalidate();
      return;
    }

    let reverse: Op[];

    if (isLiveNode(oldValue)) {
      oldValue._detach();
      reverse = oldValue._toOps(this._id, keyAsString);
    } else {
      reverse = [
        {
          type: OpCode.UPDATE_OBJECT,
          data: { [keyAsString]: oldValue },
          id: this._id,
        },
      ];
    }

    this.#map.delete(keyAsString);
    this.invalidate();

    const storageUpdates = new Map<string, LiveObjectUpdates<O>>();
    storageUpdates.set(this._id, {
      node: this,
      type: "LiveObject",
      updates: {
        [key]: { type: "delete", deletedItem: oldValue } satisfies UpdateDelta,
      } as {
        [K in keyof O]: UpdateDelta;
      },
    });

    this._pool.dispatch(
      [
        {
          type: OpCode.DELETE_OBJECT_KEY,
          key: keyAsString,
          id: this._id,
          opId: this._pool.generateOpId(),
        },
      ],
      reverse,
      storageUpdates
    );
  }

  /**
   * Adds or updates multiple properties at once with an object.
   * @param patch The object used to overrides properties
   */
  update(patch: Partial<O>): void {
    this._pool?.assertStorageIsWritable();

    // If detectLargeObjects is enabled, perform a runtime size check now so we
    // can immediately throw as soon as the max object size is exceeded.
    if (LiveObject.detectLargeObjects) {
      const data: Record<string, Json> = {};
      for (const [key, value] of this.#map) {
        if (!isLiveNode(value)) {
          data[key] = value;
        }
      }
      for (const key of Object.keys(patch)) {
        const value = patch[key];
        if (value === undefined) continue;
        if (!isLiveNode(value)) {
          data[key] = value;
        }
      }

      // Fast upper-bound check: multiply JSON string length by 4 (worst-case UTF-8)
      // This is much faster than TextEncoder and gives us an upper bound
      const jsonString = JSON.stringify(data);
      const upperBoundSize = jsonString.length * 4;

      // Only do the precise calculation if the fast check suggests we might be close
      if (upperBoundSize > MAX_LIVE_OBJECT_SIZE) {
        const preciseSize = new TextEncoder().encode(jsonString).length;
        if (preciseSize > MAX_LIVE_OBJECT_SIZE) {
          throw new Error(
            `LiveObject size exceeded limit: ${preciseSize} bytes > ${MAX_LIVE_OBJECT_SIZE} bytes. See https://liveblocks.io/docs/platform/limits#Liveblocks-Storage-limits`
          );
        }
      }
    }

    if (this._pool === undefined || this._id === undefined) {
      for (const key in patch) {
        const newValue = patch[key];
        if (newValue === undefined) {
          continue;
        }

        const oldValue = this.#map.get(key);
        if (isLiveNode(oldValue)) {
          oldValue._detach();
        }

        if (isLiveNode(newValue)) {
          newValue._setParentLink(this, key);
        }

        this.#map.set(key, newValue);
        this.invalidate();
      }

      return;
    }

    const ops: ClientWireOp[] = [];
    const reverseOps: Op[] = [];

    const opId = this._pool.generateOpId();
    const updatedProps: JsonObject = {};

    const reverseUpdateOp: UpdateObjectOp = {
      id: this._id,
      type: OpCode.UPDATE_OBJECT,
      data: {},
    };

    const updateDelta: LiveObjectUpdateDelta<O> = {};

    for (const key in patch) {
      const newValue: Lson | undefined = patch[key];
      if (newValue === undefined) {
        continue;
      }

      const oldValue = this.#map.get(key);

      if (isLiveNode(oldValue)) {
        reverseOps.push(...oldValue._toOps(this._id, key));
        oldValue._detach();
      } else if (oldValue === undefined) {
        reverseOps.push({ type: OpCode.DELETE_OBJECT_KEY, id: this._id, key });
      } else {
        reverseUpdateOp.data[key] = oldValue;
      }

      if (isLiveNode(newValue)) {
        newValue._setParentLink(this, key);
        newValue._attach(this._pool.generateId(), this._pool);
        const newAttachChildOps = newValue._toOpsWithOpId(
          this._id,
          key,
          this._pool
        );

        const createCrdtOp = newAttachChildOps.find(
          (op: Op & { parentId?: string }) => op.parentId === this._id
        );
        if (createCrdtOp) {
          // Track locally-generated opId to preserve optimistic update
          this.#unackedOpsByKey.set(key, nn(createCrdtOp.opId));
        }

        ops.push(...newAttachChildOps);
      } else {
        updatedProps[key] = newValue;
        // Track locally-generated opId to preserve optimistic update
        this.#unackedOpsByKey.set(key, opId);
      }

      this.#map.set(key, newValue);
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
    this._pool.dispatch(ops, reverseOps, storageUpdates);
  }

  toImmutable(): ToImmutable<O> {
    // Don't implement actual toImmutable logic in here. Implement it in
    // ._toImmutable() instead. This helper merely exists to help TypeScript
    // infer better return types.
    return super.toImmutable() as ToImmutable<O>;
  }

  /** @internal */
  toTreeNode(key: string): DevTools.LiveTreeNode<"LiveObject"> {
    // Don't implement actual toTreeNode logic in here. Implement it in
    // ._toTreeNode() instead. This helper merely exists to help TypeScript
    // infer better return types.
    return super.toTreeNode(key) as DevTools.LiveTreeNode<"LiveObject">;
  }

  /** @internal */
  _toTreeNode(key: string): DevTools.LsonTreeNode {
    const nodeId = this._id ?? nanoid();
    return {
      type: "LiveObject",
      id: nodeId,
      key,
      payload: Array.from(this.#map.entries()).map(([key, value]) =>
        isLiveNode(value)
          ? value.toTreeNode(key)
          : { type: "Json", id: `${nodeId}:${key}`, key, payload: value }
      ),
    };
  }

  /** @internal */
  _toImmutable(): ToImmutable<O> {
    const result: { [key: string]: unknown } = {};
    for (const [key, val] of this.#map) {
      result[key] = isLiveStructure(val) ? val.toImmutable() : val;
    }
    return (
      process.env.NODE_ENV === "production" ? result : Object.freeze(result)
    ) as ToImmutable<O>;
  }

  clone(): LiveObject<O> {
    return new LiveObject(
      Object.fromEntries(
        Array.from(this.#map).map(([key, value]) => [
          key,
          isLiveStructure(value) ? value.clone() : deepClone(value),
        ])
      ) as O
    );
  }
}
