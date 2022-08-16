import type { ApplyResult, Doc } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import { nn } from "./assert";
import type {
  CreateChildOp,
  CreateMapOp,
  IdTuple,
  JsonObject,
  LiveMapUpdates,
  LiveNode,
  Lson,
  Op,
  ParentToChildNodeMap,
  SerializedMap,
} from "./types";
import { CrdtType, OpCode } from "./types";
import {
  creationOpToLiveNode,
  deserialize,
  isLiveNode,
  liveNodeToLson,
  lsonToLiveNode,
} from "./utils";

/**
 * The LiveMap class is similar to a JavaScript Map that is synchronized on all clients.
 * Keys should be a string, and values should be serializable to JSON.
 * If multiple clients update the same property simultaneously, the last modification received by the Liveblocks servers is the winner.
 */
export class LiveMap<
  TKey extends string,
  TValue extends Lson
> extends AbstractCrdt {
  /** @internal */
  private _map: Map<TKey, LiveNode>;
  /** @internal */
  private unacknowledgedSet: Map<TKey, string>;

  constructor(entries?: readonly (readonly [TKey, TValue])[] | undefined) {
    super();
    this.unacknowledgedSet = new Map<TKey, string>();

    if (entries) {
      const mappedEntries: Array<[TKey, LiveNode]> = [];
      for (const entry of entries) {
        const value = lsonToLiveNode(entry[1]);
        value._setParentLink(this, entry[0]);
        mappedEntries.push([entry[0], value]);
      }

      this._map = new Map(mappedEntries);
    } else {
      this._map = new Map();
    }
  }

  /**
   * @internal
   */
  _serialize(parentId: string, parentKey: string, doc?: Doc): CreateChildOp[] {
    if (this._id == null) {
      throw new Error("Cannot serialize item is not attached");
    }

    const ops: CreateChildOp[] = [];
    const op: CreateMapOp = {
      id: this._id,
      opId: doc?.generateOpId(),
      type: OpCode.CREATE_MAP,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const [key, value] of this._map) {
      ops.push(...value._serialize(this._id, key, doc));
    }

    return ops;
  }

  /**
   * @internal
   */
  static _deserialize(
    [id, _item]: IdTuple<SerializedMap>,
    parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ): LiveMap<string, Lson> {
    const map = new LiveMap();
    map._attach(id, doc);

    const children = parentToChildren.get(id);

    if (children == null) {
      return map;
    }

    for (const [id, crdt] of children) {
      const child = deserialize([id, crdt], parentToChildren, doc);
      child._setParentLink(map, crdt.parentKey);
      map._map.set(crdt.parentKey, child);
      map.invalidate();
    }

    return map;
  }

  /**
   * @internal
   */
  _attach(id: string, doc: Doc): void {
    super._attach(id, doc);

    for (const [_key, value] of this._map) {
      if (isLiveNode(value)) {
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

    const { id, parentKey, opId } = op;

    const key = parentKey as TKey;
    //                    ^^^^^^^ TODO: Fix me!

    const child = creationOpToLiveNode(op);

    if (this._doc.getItem(id) !== undefined) {
      return { modified: false };
    }

    if (source === OpSource.ACK) {
      const lastUpdateOpId = this.unacknowledgedSet.get(key);
      if (lastUpdateOpId === opId) {
        // Acknowlegment from local operation
        this.unacknowledgedSet.delete(key);
        return { modified: false };
      } else if (lastUpdateOpId != null) {
        // Another local set has overriden the value, so we do nothing
        return { modified: false };
      }
    } else if (source === OpSource.REMOTE) {
      // If a remote operation set an item,
      // delete the unacknowledgedSet associated to the key
      // to make sure any future ack can override it
      this.unacknowledgedSet.delete(key);
    }

    const previousValue = this._map.get(key);
    let reverse: Op[];
    if (previousValue) {
      const thisId = nn(this._id);
      reverse = previousValue._serialize(thisId, key);
      previousValue._detach();
    } else {
      reverse = [{ type: OpCode.DELETE_CRDT, id }];
    }

    child._setParentLink(this, key);
    child._attach(id, this._doc);
    this._map.set(key, child);
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

  /**
   * @internal
   */
  _detach(): void {
    super._detach();

    for (const item of this._map.values()) {
      item._detach();
    }
  }

  /**
   * @internal
   */
  _detachChild(child: LiveNode): ApplyResult {
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

    const storageUpdate: LiveMapUpdates<TKey, TValue> = {
      node: this,
      type: "LiveMap",
      updates: { [parentKey]: { type: "delete" } },
    };

    return { modified: storageUpdate, reverse };
  }

  /**
   * @internal
   */
  _toSerializedCrdt(): SerializedMap {
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
    const value = this._map.get(key);
    if (value == undefined) {
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
    const oldValue = this._map.get(key);

    if (oldValue) {
      oldValue._detach();
    }

    const item = lsonToLiveNode(value);
    item._setParentLink(this, key);

    this._map.set(key, item);
    this.invalidate();

    if (this._doc && this._id) {
      const id = this._doc.generateId();
      item._attach(id, this._doc);

      const storageUpdates = new Map<string, LiveMapUpdates<TKey, TValue>>();
      storageUpdates.set(this._id, {
        node: this,
        type: "LiveMap",
        updates: { [key]: { type: "update" } },
      });

      const ops = item._serialize(this._id, key, this._doc);

      this.unacknowledgedSet.set(key, nn(ops[0].opId));

      this._doc.dispatch(
        item._serialize(this._id, key, this._doc),
        oldValue
          ? oldValue._serialize(this._id, key)
          : [{ type: OpCode.DELETE_CRDT, id }],
        storageUpdates
      );
    }
  }

  /**
   * Returns the number of elements in the LiveMap.
   */
  get size(): number {
    return this._map.size;
  }

  /**
   * Returns a boolean indicating whether an element with the specified key exists or not.
   * @param key The key of the element to test for presence.
   */
  has(key: TKey): boolean {
    return this._map.has(key);
  }

  /**
   * Removes the specified element by key.
   * @param key The key of the element to remove.
   * @returns true if an element existed and has been removed, or false if the element does not exist.
   */
  delete(key: TKey): boolean {
    const item = this._map.get(key);

    if (item == null) {
      return false;
    }

    item._detach();
    this._map.delete(key);
    this.invalidate();

    if (this._doc && item._id) {
      const thisId = nn(this._id);
      const storageUpdates = new Map<string, LiveMapUpdates<TKey, TValue>>();
      storageUpdates.set(thisId, {
        node: this,
        type: "LiveMap",
        updates: { [key]: { type: "delete" } },
      });
      this._doc.dispatch(
        [
          {
            type: OpCode.DELETE_CRDT,
            id: item._id,
            opId: this._doc.generateOpId(),
          },
        ],
        item._serialize(thisId, key),
        storageUpdates
      );
    }

    return true;
  }

  /**
   * Returns a new Iterator object that contains the [key, value] pairs for each element.
   */
  entries(): IterableIterator<[TKey, TValue]> {
    const innerIterator = this._map.entries();

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
    return this._map.keys();
  }

  /**
   * Returns a new Iterator object that contains the values for each element.
   */
  values(): IterableIterator<TValue> {
    const innerIterator = this._map.values();

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
  _toJson(): JsonObject {
    const result: JsonObject = {};
    for (const [key, value] of this._map) {
      result[key] = value.toJson();
    }
    return result;
  }
}
