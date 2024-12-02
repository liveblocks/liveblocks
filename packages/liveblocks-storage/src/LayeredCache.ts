import type { Json } from "~/lib/Json.js";
import { NestedMap } from "~/lib/NestedMap.js";

import type { Delta, NodeId, Pool } from "./types.js";
import { raise } from "./utils.js";

const TOMBSTONE = Symbol();

const kValue: unique symbol = Symbol();

export type ValueOrRef =
  // XXX Add { $ref: NodeId } later
  { [kValue]: Json; xxx?: Date };

type TombStone = typeof TOMBSTONE;

export class LayeredCache implements Pool {
  #nextId: number = 1;
  readonly #root: NestedMap<NodeId, string, ValueOrRef>;
  readonly #layers: NestedMap<NodeId, string, ValueOrRef | TombStone>[];

  // XXX This is a hack because it is mutated from the outside! This really
  // should not belong on the Transaction API itself!
  prefix_HACK: string | number = "tmp";

  constructor() {
    this.#root = new NestedMap();
    this.#layers = [];
  }

  nextId<P extends string>(prefix: P): `${P}${number}:${number}` {
    return `${prefix}${this.prefix_HACK as number}:${this.#nextId++}`;
  }

  // ----------------------------------------------------
  // "Multi-layer" cache idea
  // ----------------------------------------------------

  hasChild(nodeId: NodeId, key: string): boolean {
    return this.getChild(nodeId, key) !== undefined;
  }

  getValueOrRef(nodeId: NodeId, key: string): ValueOrRef | undefined {
    for (const layer of this.#layers) {
      const value = layer.get(nodeId, key);
      if (value === undefined) continue;
      if (value === TOMBSTONE) {
        return undefined;
      } else {
        return value;
      }
    }
    return this.#root.get(nodeId, key);
  }

  getJson(valueOrRef: undefined): undefined;
  getJson(valueOrRef: ValueOrRef): Json;
  getJson(valueOrRef: ValueOrRef | undefined): Json | undefined;
  getJson(cv: ValueOrRef | undefined): Json | undefined {
    if (cv === undefined) return undefined;
    return cv[kValue];
  }

  getChild(nodeId: NodeId, key: string): Json | undefined {
    return this.getJson(this.getValueOrRef(nodeId, key));
  }

  setValueOrRef(nodeId: NodeId, key: string, value: ValueOrRef): void {
    const layer = this.#layers[0] ?? this.#root;
    layer.set(nodeId, key, value);
  }

  setChild(nodeId: NodeId, key: string, value: Json): void {
    if (value === undefined) {
      this.deleteChild(nodeId, key);
    } else {
      return this.setValueOrRef(nodeId, key, { [kValue]: value });
    }
  }

  deleteChild(nodeId: NodeId, key: string): boolean {
    const layer = this.#layers[0];
    if (layer) {
      layer.set(nodeId, key, TOMBSTONE);
    } else {
      this.#root.delete(nodeId, key);
    }
    // TODO Maybe make this return false if not deleted?
    return true;
  }

  *keys(nodeId: NodeId): IterableIterator<string> {
    if (this.#layers.length === 0) {
      yield* this.#root.keysAt(nodeId);
    } else {
      for (const [key] of this.entries__(nodeId)) {
        yield key;
      }
    }
  }

  private *entries__(
    nodeId: NodeId
  ): IterableIterator<[key: string, value: ValueOrRef]> {
    if (this.#layers.length === 0) {
      yield* this.#root.entriesAt(nodeId);
      return;
    }

    const seen = new Set<string>();

    function seenBefore(key: string): boolean {
      if (seen.has(key)) {
        return true;
      } else {
        seen.add(key);
        return false;
      }
    }

    for (const layer of this.#layers) {
      for (const [key, value] of layer.entriesAt(nodeId)) {
        if (!seenBefore(key)) {
          if (value !== TOMBSTONE) {
            yield [key, value];
          }
        }
      }
    }

    for (const [key, value] of this.#root.entriesAt(nodeId)) {
      if (!seenBefore(key)) {
        yield [key, value];
      }
    }
  }

  *entries(nodeId: NodeId): IterableIterator<[key: string, value: Json]> {
    for (const [key, valueOrRef] of this.entries__(nodeId)) {
      yield [key, this.getJson(valueOrRef)];
    }
  }

  // ----------------------------------------------------
  // Transaction API
  // ----------------------------------------------------

  /**
   * Rolls back all transactions, and resets the LayeredCache to its initial,
   * empty, state.
   */
  reset(): void {
    this.#layers.length = 0;
    this.#root.clear();
  }

  startTransaction(): void {
    this.#layers.unshift(new NestedMap());
  }

  /**
   * Computes a Delta within the current transaction.
   */
  delta(): Delta {
    const layer = this.#layers[0] ?? raise("No transaction to get delta for");

    const deleted: Record<NodeId, string[]> = {};
    // For efficient packing, we'll codify all k,v pairs in a single array
    // [key1, value1, key2, value2, key3, value3, ...]
    const updated: Record<NodeId, Record<string, Json>> = {};

    for (const [nodeId, key, value] of layer) {
      if (value === TOMBSTONE) {
        if (!deleted[nodeId]) deleted[nodeId] = [];
        deleted[nodeId]!.push(key);
      } else {
        if (!updated[nodeId]) updated[nodeId] = {};
        updated[nodeId]![key] = value[kValue];
      }
    }

    return [deleted, updated];
  }

  commit(): void {
    const layer = this.#layers.shift() ?? raise("No transaction to commit");
    for (const [nodeId, key, value] of layer) {
      if (value === TOMBSTONE) {
        this.deleteChild(nodeId, key);
      } else {
        this.setValueOrRef(nodeId, key, value);
      }
    }
  }

  rollback(): void {
    this.#layers.shift() ?? raise("No transaction to roll back");
  }

  // For convenience in unit tests only --------------------------------
  *[Symbol.iterator](): IterableIterator<
    [nodeId: NodeId, key: string, value: ValueOrRef]
  > {
    const seen = new Set<string>();

    function seenBefore(key: string): boolean {
      if (seen.has(key)) {
        return true;
      } else {
        seen.add(key);
        return false;
      }
    }

    for (const layer of this.#layers) {
      for (const nid of layer.topLevelKeys()) {
        if (!seenBefore(nid)) {
          for (const [key, val] of this.entries__(nid)) {
            yield [nid, key, val];
          }
        }
      }
    }

    for (const nid of this.#root.topLevelKeys()) {
      if (!seenBefore(nid)) {
        for (const [key, val] of this.entries__(nid)) {
          yield [nid, key, val];
        }
      }
    }
  }

  /**
   * Returns the number of items in the cache.
   * Unlike Map.size, LayeredCache.count() is a slow operation that requires
   * iterating over every entry.
   * XXX Make faster!
   */
  get count(): number {
    let total = 0;
    for (const _ of this) {
      ++total;
    }
    return total;
  }

  get data(): Record<string, Record<string, Json>> {
    const obj: Record<string, Record<string, Json>> = {};
    for (const [nid, key, value] of this) {
      (obj[nid] ??= {})[key] = value[kValue];
    }
    return obj;
  }
}
