import { DefaultMap } from "./DefaultMap";
import { SortedList } from "./SortedList";
import { raise } from "./utils";

type PK = string | number;

/**
 * A "pool" is a data structure that allows for easy insertion, deletion,
 * mutation, sorting, and accessing of an object pool of objects that have
 * tree-like relationships.
 *
 *   const pool = new Pool<Simpson>(
 *     x => x.id,
 *     x => x.parent,
 *     (a, b) => a.name < b.name,
 *   );
 *
 * The first argument is a function that returns the primary key of an item.
 * The second argument is a function that returns the parent ID for an item (or null if its a root).
 * The third argument is a function that returns how to compare two items, to
 *   return queries in sorted order.
 *
 * To insert elements into the pool:
 *
 *   pool.upsert({ id: "1", name: "Homer" });
 *   pool.upsert({ id: "2", name: "Marge" });
 *   pool.upsert({ id: "3", name: "Bart", parent: "2" });
 *   pool.upsert({ id: "4", name: "Lisa", parent: "2" });
 *   pool.upsert({ id: "5", name: "Maggie", parent: "2" });
 *
 * To get all items in the pool:
 *
 *   // Items are sorted by the given comparison function, in this case
 *   // alphabetically, so: Bart, Homer, Lisa, Maggie, Marge
 *   Array.from(pool)  // [{ id: "3", name: "Bart", parent: "2" }, ...]
 *
 * To get all children:
 *
 *   // All kids are added as children of Marge
 *   pool.getChildren("1")  // [] (Homer has no kids)
 *   pool.getChildren("2")  // [Bart, Lisa, Maggie] (= alphabetically)
 *
 * To get all "roots":
 *   pool.getChildren(null)  // [Homer, Marge] (= alphabetically)
 *
 * To get all siblings:
 *   pool.getSiblings("3")  // [Lisa, Maggie]
 *   pool.getSiblings("4")  // [Bart, Maggie]
 *   pool.getSiblings("5")  // [Bart, Lisa]
 *
 * A bit weird maybe, but Homer and Marge are siblings in this example:
 *   pool.getSiblings("1")  // [Marge]
 *   pool.getSiblings("2")  // [Homer]
 *
 * Changing data is no problem, as long as the primary key and parent key don't change:
 *   pool.upsert({ id: "1", name: "Homer Simpson" });
 *   pool.upsert({ id: "3", name: "Bart, son of Marge", parent: "2" });
 *
 * But... this will throw an error:
 *   pool.upsert({ id: "3", name: "Bart, son of Homer", parent: "1" });
 *   //                                                         ^^^
 *   //                                Cannot change parent ID. If you want to ever
 *   //                                do this, remove the entry, and recreate it!
 *
 */
export class TreePool<T> {
  #_items: Map<PK, T>;
  #_childrenOf: DefaultMap</* parent */ PK | null, /* children */ Set<PK>>;
  #_sorted: SortedList<T>;

  #_primaryKey: (item: T) => PK;
  #_parentKeyFn: (item: T) => PK | null;
  #_lt: (a: T, b: T) => boolean;

  constructor(
    primaryKey: (item: T) => PK,
    parentKey: (item: T) => PK | null,
    lt: (a: T, b: T) => boolean
  ) {
    this.#_primaryKey = primaryKey;
    this.#_parentKeyFn = parentKey;
    this.#_lt = lt;

    this.#_items = new Map();
    this.#_childrenOf = new DefaultMap(() => new Set());
    this.#_sorted = SortedList.with(lt);
  }

  public get(id: PK): T | undefined {
    return this.#_items.get(id);
  }

  public getOrThrow(id: PK): T {
    return this.get(id) ?? raise(`Item with id ${id} not found`);
  }

  public get sorted(): SortedList<T> {
    // XXX While it's fine to expose this SortedList for efficiency, really we
    // should be exposing it as a readonly value.
    return this.#_sorted;
  }

  public getParentId(id: PK): PK | null {
    const item = this.getOrThrow(id);
    return this.#_parentKeyFn(item);
  }

  public getParent(id: PK): T | null {
    const parentId = this.getParentId(id);
    return parentId ? this.getOrThrow(parentId) : null;
  }

  public getChildren(id: PK | null): readonly T[] {
    const childIds = this.#_childrenOf.get(id);
    if (!childIds) return [];
    return SortedList.from(
      Array.from(childIds).map(
        (id) => this.#_items.get(id)! // eslint-disable-line no-restricted-syntax
      ),
      this.#_lt
    ).rawArray;
  }

  /** Returns all siblings, not including the item itself. */
  public getSiblings(id: PK): readonly T[] {
    const self = this.getOrThrow(id);
    const parent = this.getParentId(id);
    return this.getChildren(parent).filter((item) => item !== self);
  }

  public [Symbol.iterator](): IterableIterator<T> {
    return this.#_sorted[Symbol.iterator]();
  }

  public upsert(item: T): void {
    const pk = this.#_primaryKey(item);
    const existing = this.#_items.get(pk);
    if (existing) {
      // Allow upserts if the parent ID hasn't changed, otherwise, remove the
      // entry and replace it with the new item
      if (this.#_parentKeyFn(existing) !== this.#_parentKeyFn(item)) {
        throw new Error(
          "Cannot upsert parent ID changes that change the tree structure. Remove the entry first, and recreate it"
        );
      }

      this.#_sorted.remove(existing);
    }

    this.#_items.set(pk, item);
    this.#_sorted.add(item);

    const parentId = this.#_parentKeyFn(item);
    this.#_childrenOf.getOrCreate(parentId).add(pk);
  }

  public remove(pk: PK): boolean {
    const item = this.#_items.get(pk);
    if (!item) return false;

    const childIds = this.#_childrenOf.get(pk);
    if (childIds) {
      throw new Error(
        `Cannot remove item '${pk}' while it still has children. Remove children first.`
      );
    }

    const parentId = this.#_parentKeyFn(item);
    const siblings = this.#_childrenOf.get(parentId);
    if (siblings) {
      siblings.delete(pk);
      if (siblings.size === 0) {
        this.#_childrenOf.delete(parentId);
      }
    }

    this.#_sorted.remove(item);
    this.#_childrenOf.delete(pk);
    this.#_items.delete(pk);
    return true;
  }

  public clear(): boolean {
    if (this.#_items.size === 0) return false;

    this.#_childrenOf.clear();
    this.#_items.clear();
    this.#_sorted.clear();
    return true;
  }
}
