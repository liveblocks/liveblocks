import type { Json } from "~/lib/Json.js";
import { NestedMap } from "~/lib/NestedMap.js";

import { LiveObject } from "./LiveObject.js";
import type { Delta, NodeId, Pool } from "./types.js";
import { raise } from "./utils.js";

const TOMBSTONE = Symbol();

type TombStone = typeof TOMBSTONE;

export class LayeredCache implements Pool {
  #nextId: number = 1;
  readonly #root: NestedMap<NodeId, string, Json>;
  readonly #layers: NestedMap<NodeId, string, Json | TombStone>[];

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

  getRoot(): LiveObject {
    return LiveObject._load("root", this);
  }

  hasChild(nodeId: NodeId, key: string): boolean {
    return this.getChild(nodeId, key) !== undefined;
  }

  getChild(nodeId: NodeId, key: string): Json | undefined {
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

  setChild(nodeId: NodeId, key: string, value: Json): void {
    if (value === undefined) {
      this.deleteChild(nodeId, key);
    } else {
      const layer = this.#layers[0] ?? this.#root;
      layer.set(nodeId, key, value);
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
      for (const [key] of this.entries(nodeId)) {
        yield key;
      }
    }
  }

  *entries(nodeId: NodeId): IterableIterator<[key: string, value: Json]> {
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
        updated[nodeId]![key] = value;
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
        this.setChild(nodeId, key, value);
      }
    }
  }

  rollback(): void {
    this.#layers.shift() ?? raise("No transaction to roll back");
  }

  // For convenience in unit tests only --------------------------------
  *[Symbol.iterator](): IterableIterator<
    [nodeId: NodeId, key: string, value: Json]
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
          for (const [key, val] of this.entries(nid)) {
            yield [nid, key, val];
          }
        }
      }
    }

    for (const nid of this.#root.topLevelKeys()) {
      if (!seenBefore(nid)) {
        for (const [key, val] of this.entries(nid)) {
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
      (obj[nid] ??= {})[key] = value;
    }
    return obj;
  }
}
