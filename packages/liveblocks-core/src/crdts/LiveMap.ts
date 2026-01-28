import { nn } from "../lib/assert";
import { freeze } from "../lib/freeze";
import { nanoid } from "../lib/nanoid";
import type { CreateMapOp, CreateOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { MapStorageNode, SerializedMap } from "../protocol/StorageNode";
import { CrdtType } from "../protocol/StorageNode";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { ParentToChildNodeMap } from "../types/NodeMap";
import type { ApplyResult, ManagedPool } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import {
  creationOpToLiveNode,
  deserialize,
  isLiveNode,
  liveNodeToLson,
  lsonToLiveNode,
} from "./liveblocks-helpers";
import type { LiveNode, Lson } from "./Lson";
import type { UpdateDelta } from "./UpdateDelta";
import type { ToImmutable } from "./utils";

/**
 * A LiveMap notification that is sent in-client to any subscribers whenever
 * one or more of the values inside the LiveMap instance have changed.
 */
export type LiveMapUpdates<TKey extends string, TValue extends Lson> = {
  type: "LiveMap";
  node: LiveMap<TKey, TValue>;
  updates: { [key: string]: UpdateDelta };
  //               ^^^^^^
  //               FIXME: `string` is not specific enough here. See if we can
  //               improve this type to match TKey!
};

/**
 * The LiveMap class is similar to a JavaScript Map that is synchronized on all clients.
 * Keys should be a string, and values should be serializable to JSON.
 * If multiple clients update the same property simultaneously, the last modification received by the Liveblocks servers is the winner.
 */
export class LiveMap<
  TKey extends string,
  TValue extends Lson,
> extends AbstractCrdt {
  #map: Map<TKey, LiveNode>;
  #unacknowledgedSet: Map<TKey, string>;

  constructor(entries?: readonly (readonly [TKey, TValue])[] | undefined) {
    super();
    this.#unacknowledgedSet = new Map<TKey, string>();

    if (entries) {
      const mappedEntries: [TKey, LiveNode][] = [];
      for (const [key, value] of entries) {
        const node = lsonToLiveNode(value);
        node._setParentLink(this, key);
        mappedEntries.push([key, node]);
      }
      this.#map = new Map(mappedEntries);
    } else {
      this.#map = new Map();
    }
  }

  /** @internal */
  _toOps(parentId: string, parentKey: string): CreateOp[] {
    if (this._id === undefined) {
      throw new Error("Cannot serialize item is not attached");
    }

    const ops: CreateOp[] = [];
    const op: CreateMapOp = {
      id: this._id,
      type: OpCode.CREATE_MAP,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const [key, value] of this.#map) {
      ops.push(...value._toOps(this._id, key));
    }

    return ops;
  }

  /** @internal */
  static _deserialize(
    [id, _item]: MapStorageNode,
    parentToChildren: ParentToChildNodeMap,
    pool: ManagedPool
  ): LiveMap<string, Lson> {
    const map = new LiveMap();
    map._attach(id, pool);

    const children = parentToChildren.get(id);
    if (children === undefined) {
      return map;
    }

    for (const node of children) {
      const crdt = node[1];
      const child = deserialize(node, parentToChildren, pool);
      child._setParentLink(map, crdt.parentKey);
      map.#map.set(crdt.parentKey, child);
      map.invalidate();
    }

    return map;
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

    const { id, parentKey, opId } = op;

    const key = parentKey as TKey;
    //                    ^^^^^^^ TODO: Fix me!

    const child = creationOpToLiveNode(op);

    if (this._pool.getNode(id) !== undefined) {
      return { modified: false };
    }

    if (source === OpSource.OURS) {
      const lastUpdateOpId = this.#unacknowledgedSet.get(key);
      if (lastUpdateOpId === opId) {
        // Acknowlegment from local operation
        this.#unacknowledgedSet.delete(key);
        return { modified: false };
      } else if (lastUpdateOpId !== undefined) {
        // Another local set has overriden the value, so we do nothing
        return { modified: false };
      }
    } else if (source === OpSource.THEIRS) {
      // If a remote operation set an item,
      // delete the unacknowledgedSet associated to the key
      // to make sure any future ack can override it
      this.#unacknowledgedSet.delete(key);
    }

    const previousValue = this.#map.get(key);
    let reverse: Op[];
    if (previousValue) {
      const thisId = nn(this._id);
      reverse = previousValue._toOps(thisId, key);
      previousValue._detach();
    } else {
      reverse = [{ type: OpCode.DELETE_CRDT, id }];
    }

    child._setParentLink(this, key);
    child._attach(id, this._pool);
    this.#map.set(key, child);
    this.invalidate();

    return {
      modified: {
        node: this,
        type: "LiveMap",
        updates: { [key]: { type: "update" } },
      },
      reverse,
    };
  }

  /** @internal */
  _detach(): void {
    super._detach();

    for (const item of this.#map.values()) {
      item._detach();
    }
  }

  /** @internal */
  _detachChild(child: LiveNode): ApplyResult {
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

    const storageUpdate: LiveMapUpdates<TKey, TValue> = {
      node: this,
      type: "LiveMap",
      updates: {
        [parentKey]: {
          type: "delete",
          deletedItem: liveNodeToLson(child),
        },
      },
    };

    return { modified: storageUpdate, reverse };
  }

  /** @internal */
  _serialize(): SerializedMap {
    if (this.parent.type !== "HasParent") {
      throw new Error("Cannot serialize LiveMap if parent is missing");
    }

    return {
      type: CrdtType.MAP,
      parentId: nn(this.parent.node._id, "Parent node expected to have ID"),
      parentKey: this.parent.key,
    };
  }

  /**
   * Returns a specified element from the LiveMap.
   * @param key The key of the element to return.
   * @returns The element associated with the specified key, or undefined if the key can't be found in the LiveMap.
   */
  get(key: TKey): TValue | undefined {
    const value = this.#map.get(key);
    if (value === undefined) {
      return undefined;
    }
    return liveNodeToLson(value) as TValue | undefined;
    //                           ^^^^^^^^^^^^^^^^^^^^^
    //                           FIXME! This isn't safe.
  }

  /**
   * Adds or updates an element with a specified key and a value.
   * @param key The key of the element to add. Should be a string.
   * @param value The value of the element to add. Should be serializable to JSON.
   */
  set(key: TKey, value: TValue): void {
    this._pool?.assertStorageIsWritable();
    const oldValue = this.#map.get(key);

    if (oldValue) {
      oldValue._detach();
    }

    const item = lsonToLiveNode(value);
    item._setParentLink(this, key);

    this.#map.set(key, item);
    this.invalidate();

    if (this._pool && this._id) {
      const id = this._pool.generateId();
      item._attach(id, this._pool);

      const storageUpdates = new Map<string, LiveMapUpdates<TKey, TValue>>();
      storageUpdates.set(this._id, {
        node: this,
        type: "LiveMap",
        updates: { [key]: { type: "update" } },
      });

      const ops = item._toOpsWithOpId(this._id, key, this._pool);

      this.#unacknowledgedSet.set(key, nn(ops[0].opId));

      this._pool.dispatch(
        ops,
        oldValue
          ? oldValue._toOps(this._id, key)
          : [{ type: OpCode.DELETE_CRDT, id }],
        storageUpdates
      );
    }
  }

  /**
   * Returns the number of elements in the LiveMap.
   */
  get size(): number {
    return this.#map.size;
  }

  /**
   * Returns a boolean indicating whether an element with the specified key exists or not.
   * @param key The key of the element to test for presence.
   */
  has(key: TKey): boolean {
    return this.#map.has(key);
  }

  /**
   * Removes the specified element by key.
   * @param key The key of the element to remove.
   * @returns true if an element existed and has been removed, or false if the element does not exist.
   */
  delete(key: TKey): boolean {
    this._pool?.assertStorageIsWritable();
    const item = this.#map.get(key);

    if (item === undefined) {
      return false;
    }

    item._detach();
    this.#map.delete(key);
    this.invalidate();

    if (this._pool && item._id) {
      const thisId = nn(this._id);
      const storageUpdates = new Map<string, LiveMapUpdates<TKey, TValue>>();
      storageUpdates.set(thisId, {
        node: this,
        type: "LiveMap",
        updates: {
          [key]: {
            type: "delete",
            deletedItem: liveNodeToLson(item),
          },
        },
      });
      this._pool.dispatch(
        [
          {
            type: OpCode.DELETE_CRDT,
            id: item._id,
            opId: this._pool.generateOpId(),
          },
        ],
        item._toOps(thisId, key),
        storageUpdates
      );
    }

    return true;
  }

  /**
   * Returns a new Iterator object that contains the [key, value] pairs for each element.
   */
  entries(): IterableIterator<[TKey, TValue]> {
    const innerIterator = this.#map.entries();

    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        const iteratorValue = innerIterator.next();

        if (iteratorValue.done) {
          return {
            done: true,
            value: undefined,
          };
        }

        const entry = iteratorValue.value;

        const key = entry[0];
        const value = liveNodeToLson(iteratorValue.value[1]) as TValue;
        //                                                   ^^^^^^^^^
        //                                                   FIXME! This isn't safe.
        return {
          value: [key, value],
        };
      },
    };
  }

  /**
   * Same function object as the initial value of the entries method.
   */
  [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
    return this.entries();
  }

  /**
   * Returns a new Iterator object that contains the keys for each element.
   */
  keys(): IterableIterator<TKey> {
    return this.#map.keys();
  }

  /**
   * Returns a new Iterator object that contains the values for each element.
   */
  values(): IterableIterator<TValue> {
    const innerIterator = this.#map.values();

    return {
      [Symbol.iterator]() {
        return this;
      },
      next() {
        const iteratorValue = innerIterator.next();

        if (iteratorValue.done) {
          return {
            done: true,
            value: undefined,
          };
        }

        const value = liveNodeToLson(iteratorValue.value) as TValue;
        //                                                ^^^^^^^^^
        //                                                FIXME! This isn't safe.

        return { value };
      },
    };
  }

  /**
   * Executes a provided function once per each key/value pair in the Map object, in insertion order.
   * @param callback Function to execute for each entry in the map.
   */
  forEach(
    callback: (value: TValue, key: TKey, map: LiveMap<TKey, TValue>) => void
  ): void {
    for (const entry of this) {
      callback(entry[1], entry[0], this);
    }
  }

  /** @internal */
  _toTreeNode(key: string): DevTools.LsonTreeNode {
    return {
      type: "LiveMap",
      id: this._id ?? nanoid(),
      key,
      payload: Array.from(this.#map.entries()).map(([key, val]) =>
        val.toTreeNode(key)
      ),
    };
  }

  toImmutable(): ReadonlyMap<TKey, ToImmutable<TValue>> {
    // Don't implement actual toImmutable logic in here. Implement it in
    // ._toImmutable() instead. This helper merely exists to help TypeScript
    // infer better return types.
    return super.toImmutable() as ReadonlyMap<TKey, ToImmutable<TValue>>;
  }

  /** @internal */
  _toImmutable(): ReadonlyMap<TKey, ToImmutable<TValue>> {
    const result: Map<TKey, ToImmutable<TValue>> = new Map();
    for (const [key, value] of this.#map) {
      result.set(key, value.toImmutable() as ToImmutable<TValue>);
    }
    return freeze(result);
  }

  clone(): LiveMap<TKey, TValue> {
    return new LiveMap(
      Array.from(this.#map).map(([key, node]) => [key, node.clone() as TValue])
    );
  }
}
