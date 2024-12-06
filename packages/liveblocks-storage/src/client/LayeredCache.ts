import { DefaultMap } from "~/lib/DefaultMap.js";
import type { Json } from "~/lib/Json.js";
import type { LiveStructure, Lson } from "~/lib/Lson.js";
import { isLiveStructure } from "~/lib/Lson.js";
import { NestedMap } from "~/lib/NestedMap.js";
import { LiveObject } from "~/LiveObject.js";
import type { Delta, NodeId, Pool } from "~/types.js";
import { raise } from "~/utils.js";

const TOMBSTONE = Symbol();

export type ValueOrRef =
  | { $val: Json; $ref?: never }
  | { $ref: NodeId; $val?: never };

type TombStone = typeof TOMBSTONE;

export class LayeredCache implements Pool {
  #nextId: number = 1;
  readonly #root: NestedMap<NodeId, string, ValueOrRef>;
  readonly #layers: NestedMap<NodeId, string, ValueOrRef | TombStone>[];
  readonly #poolCache: DefaultMap<NodeId, LiveStructure>;

  // XXX This is a hack because it is mutated from the outside! This really
  // should not belong on the Transaction API itself!
  prefix_HACK: string | number = "tmp";

  constructor() {
    this.#root = new NestedMap();
    this.#layers = [];

    this.#poolCache = new DefaultMap((nodeId: NodeId) =>
      LiveObject._load(nodeId, this)
    );
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

  getLson(valueOrRef: undefined): undefined;
  getLson(valueOrRef: ValueOrRef): Lson;
  getLson(valueOrRef: ValueOrRef | undefined): Lson | undefined;
  getLson(cv: ValueOrRef | undefined): Lson | undefined {
    if (cv === undefined) return undefined;
    if (cv.$val !== undefined) return cv.$val;
    return this.#poolCache.getOrCreate(cv.$ref);
  }

  getRoot(): LiveObject {
    return this.getNode("root");
  }

  getNode(nodeId: NodeId): LiveObject {
    return this.#poolCache.getOrCreate(nodeId);
  }

  getChild(nodeId: NodeId, key: string): Lson | undefined {
    return this.getLson(this.getValueOrRef(nodeId, key));
  }

  setValueOrRef(nodeId: NodeId, key: string, value: ValueOrRef): void {
    const layer = this.#layers[0] ?? this.#root;
    layer.set(nodeId, key, value);
  }

  setChild(nodeId: NodeId, key: string, value: Lson): void {
    if (value === undefined) {
      this.deleteChild(nodeId, key);
    } else if (isLiveStructure(value)) {
      const $ref = value._attach(this);
      return this.setValueOrRef(nodeId, key, { $ref });
    } else {
      return this.setValueOrRef(nodeId, key, { $val: value });
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

  *entries(nodeId: NodeId): IterableIterator<[key: string, value: Lson]> {
    for (const [key, valueOrRef] of this.entries__(nodeId)) {
      yield [key, this.getLson(valueOrRef)];
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
    const values: Record<NodeId, Record<string, Json>> = {};
    const refs: Record<NodeId, Record<string, string>> = {};

    for (const [nodeId, key, value] of layer) {
      if (value === TOMBSTONE) {
        if (!deleted[nodeId]) deleted[nodeId] = [];
        deleted[nodeId]!.push(key);
      } else if (value.$ref !== undefined) {
        if (!refs[nodeId]) refs[nodeId] = {};
        refs[nodeId]![key] = value.$ref;
      } else {
        if (!values[nodeId]) values[nodeId] = {};
        values[nodeId]![key] = value.$val;
      }
    }

    return [deleted, values, refs];
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
  /** @internal - For unit tests only */
  *#iter(): IterableIterator<[nodeId: NodeId, key: string, value: ValueOrRef]> {
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

  /** @internal - For unit tests only */
  get count(): number {
    let total = 0;
    for (const _ of this.#iter()) {
      ++total;
    }
    return total;
  }

  /** @internal - For unit tests only */
  get data(): Record<string, Record<string, Json>> {
    const obj: Record<string, Record<string, Json>> = {};
    for (const [nid, key, value] of this.#iter()) {
      (obj[nid] ??= {})[key] =
        value.$val !== undefined ? value.$val : { $ref: value.$ref };
    }
    return obj;
  }
}
