/**
 * WASM-backed LiveList implementation.
 *
 * Holds a reference to a CrdtDocumentOwner + nodeId and delegates all
 * operations to the WASM document. Structurally compatible with the JS
 * LiveList class via TypeScript's duck typing.
 */

import type { CrdtDocumentOwner } from "./impl-selector";
import type { Lson } from "./Lson";
import type { ToImmutable } from "./utils";
import { resolveEntry } from "./wasm-live-helpers";

export class WasmLiveList<TItem extends Lson = Lson> {
  /** @internal */
  readonly _owner: CrdtDocumentOwner;
  /** @internal */
  readonly _nodeId: string;

  constructor(owner: CrdtDocumentOwner, nodeId: string) {
    this._owner = owner;
    this._nodeId = nodeId;
  }

  // -- Read delegation --

  get length(): number {
    return this._owner.listLength(this._nodeId);
  }

  get(index: number): TItem | undefined {
    const entry = this._owner.listGetEntry(this._nodeId, index);
    if (entry === undefined) {
      return undefined;
    }
    return resolveEntry(this._owner, entry) as TItem;
  }

  toArray(): TItem[] {
    const entries = this._owner.listEntries(this._nodeId);
    return entries.map((entry) => resolveEntry(this._owner, entry) as TItem);
  }

  toImmutable(): readonly ToImmutable<TItem>[] {
    return this._owner.listToImmutable(this._nodeId) as readonly ToImmutable<TItem>[];
  }

  [Symbol.iterator](): IterableIterator<TItem> {
    return this.toArray()[Symbol.iterator]();
  }

  // -- Array-like helpers (delegate through toArray) --

  every(predicate: (value: TItem, index: number) => unknown): boolean {
    return this.toArray().every(predicate);
  }

  filter(predicate: (value: TItem, index: number) => unknown): TItem[] {
    return this.toArray().filter(predicate);
  }

  find(
    predicate: (value: TItem, index: number) => unknown
  ): TItem | undefined {
    return this.toArray().find(predicate);
  }

  findIndex(predicate: (value: TItem, index: number) => unknown): number {
    return this.toArray().findIndex(predicate);
  }

  forEach(callbackfn: (value: TItem, index: number) => void): void {
    this.toArray().forEach(callbackfn);
  }

  indexOf(searchElement: TItem, fromIndex?: number): number {
    return this.toArray().indexOf(searchElement, fromIndex);
  }

  lastIndexOf(searchElement: TItem, fromIndex?: number): number {
    return this.toArray().lastIndexOf(searchElement, fromIndex);
  }

  map<U>(callback: (value: TItem, index: number) => U): U[] {
    return this.toArray().map(callback);
  }

  some(predicate: (value: TItem, index: number) => unknown): boolean {
    return this.toArray().some(predicate);
  }

  // -- Write delegation --

  push(element: TItem): void {
    this._owner.listPush(this._nodeId, element);
  }

  insert(element: TItem, index: number): void {
    this._owner.listInsert(this._nodeId, element, index);
  }

  move(index: number, targetIndex: number): void {
    this._owner.listMove(this._nodeId, index, targetIndex);
  }

  delete(index: number): void {
    this._owner.listDelete(this._nodeId, index);
  }

  set(index: number, item: TItem): void {
    this._owner.listSet(this._nodeId, index, item);
  }

  clear(): void {
    this._owner.listClear(this._nodeId);
  }
}
