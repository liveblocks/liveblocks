/**
 * WASM-backed LiveList implementation.
 *
 * Holds a reference to a CrdtDocumentOwner + nodeId and delegates all
 * operations to the WASM document. Structurally compatible with the JS
 * LiveList class via TypeScript's duck typing.
 */

import type { CrdtDocumentOwner } from "./impl-selector";
import { LiveList as JsLiveList } from "./LiveList";
import { LiveMap as JsLiveMap } from "./LiveMap";
import { LiveObject as JsLiveObject } from "./LiveObject";
import type { Lson } from "./Lson";
import type { ToImmutable } from "./utils";
import { resolveEntry, toPlain, makeParentInfo } from "./wasm-live-helpers";

export class WasmLiveList<TItem extends Lson = Lson> {
  /** @internal */
  readonly _owner: CrdtDocumentOwner;
  /** @internal */
  readonly _nodeId: string;

  constructor(owner: CrdtDocumentOwner, nodeId: string) {
    this._owner = owner;
    this._nodeId = nodeId;
  }

  /** @internal */
  get parent(): { type: "HasParent"; node: unknown; key: string; pos: string } | { type: "NoParent" } {
    return makeParentInfo(this._owner, this._nodeId);
  }

  /** @internal */
  _getParentKeyOrThrow(): string {
    const info = this._owner.getParentInfo(this._nodeId);
    if (!info) throw new Error("Node has no parent");
    return info.parentKey;
  }

  /** @internal */
  _indexOfPosition(position: string): number {
    // Walk through all list entries and find the child whose parentKey matches
    const entries = this._owner.listEntries(this._nodeId) as Array<{
      type: string;
      nodeId?: string;
      nodeType?: string;
      value?: unknown;
    }>;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.type === "node" && entry.nodeId) {
        const info = this._owner.getParentInfo(entry.nodeId);
        if (info && info.parentKey === position) {
          return i;
        }
      }
    }
    return -1;
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
    const entries = this._owner.listEntries(this._nodeId);
    return entries.map((entry) => {
      const child = resolveEntry(this._owner, entry);
      if (
        child !== null &&
        typeof child === "object" &&
        "toImmutable" in child &&
        typeof (child as Record<string, unknown>).toImmutable === "function"
      ) {
        return (child as { toImmutable(): unknown }).toImmutable();
      }
      return child;
    }) as readonly ToImmutable<TItem>[];
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
    this._owner.listPush(this._nodeId, toPlain(element));
  }

  insert(element: TItem, index: number): void {
    this._owner.listInsert(this._nodeId, toPlain(element), index);
  }

  move(index: number, targetIndex: number): void {
    this._owner.listMove(this._nodeId, index, targetIndex);
  }

  delete(index: number): void {
    this._owner.listDelete(this._nodeId, index);
  }

  set(index: number, item: TItem): void {
    this._owner.listSet(this._nodeId, index, toPlain(item));
  }

  clear(): void {
    this._owner.listClear(this._nodeId);
  }

  clone(): JsLiveList<TItem> {
    const items = this.toArray().map((item) => cloneItem(item));
    return new JsLiveList(items as TItem[]);
  }
}

function cloneItem(item: unknown): unknown {
  if (item === null || item === undefined || typeof item !== "object") {
    return item;
  }
  if (item instanceof WasmLiveObject || item instanceof JsLiveObject) {
    return (item as { clone(): unknown }).clone();
  }
  if (item instanceof WasmLiveList || item instanceof JsLiveList) {
    return (item as { clone(): unknown }).clone();
  }
  if (item instanceof WasmLiveMap || item instanceof JsLiveMap) {
    return (item as { clone(): unknown }).clone();
  }
  // Plain object — deep clone
  return JSON.parse(JSON.stringify(item));
}
