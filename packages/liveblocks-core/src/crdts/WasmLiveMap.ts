/**
 * WASM-backed LiveMap implementation.
 *
 * Holds a reference to a CrdtDocumentOwner + nodeId and delegates all
 * operations to the WASM document. Structurally compatible with the JS
 * LiveMap class via TypeScript's duck typing.
 */

import type { CrdtDocumentOwner } from "./impl-selector";
import { LiveMap as JsLiveMap } from "./LiveMap";
import type { Lson } from "./Lson";
import type { ToImmutable } from "./utils";
import { makeParentInfo,resolveEntry, toPlain } from "./wasm-live-helpers";

export class WasmLiveMap<
  TKey extends string = string,
  TValue extends Lson = Lson,
> {
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

  // -- Read delegation --

  get(key: TKey): TValue | undefined {
    const entry = this._owner.mapGetEntry(this._nodeId, key);
    if (entry === undefined) {
      return undefined;
    }
    return resolveEntry(this._owner, entry) as TValue;
  }

  has(key: TKey): boolean {
    return this._owner.mapHas(this._nodeId, key);
  }

  get size(): number {
    return this._owner.mapSize(this._nodeId);
  }

  entries(): IterableIterator<[TKey, TValue]> {
    const rawEntries = this._owner.mapEntries(this._nodeId);
    const resolved: [TKey, TValue][] = rawEntries.map(([key, entry]) => [
      key as TKey,
      resolveEntry(this._owner, entry) as TValue,
    ]);
    return resolved[Symbol.iterator]();
  }

  keys(): IterableIterator<TKey> {
    const rawKeys = this._owner.mapKeys(this._nodeId);
    return (rawKeys as TKey[])[Symbol.iterator]();
  }

  values(): IterableIterator<TValue> {
    const rawEntries = this._owner.mapEntries(this._nodeId);
    const resolved: TValue[] = rawEntries.map(
      ([, entry]) => resolveEntry(this._owner, entry) as TValue
    );
    return resolved[Symbol.iterator]();
  }

  forEach(
    callback: (value: TValue, key: TKey, map: WasmLiveMap<TKey, TValue>) => void
  ): void {
    const rawEntries = this._owner.mapEntries(this._nodeId);
    for (const [key, entry] of rawEntries) {
      callback(resolveEntry(this._owner, entry) as TValue, key as TKey, this);
    }
  }

  toImmutable(): ReadonlyMap<TKey, ToImmutable<TValue>> {
    const rawEntries = this._owner.mapEntries(this._nodeId);
    const map = new Map<TKey, ToImmutable<TValue>>();
    for (const [key, entry] of rawEntries) {
      const child = resolveEntry(this._owner, entry);
      const immutable =
        child !== null &&
        typeof child === "object" &&
        "toImmutable" in child &&
        typeof (child as Record<string, unknown>).toImmutable === "function"
          ? (child as { toImmutable(): unknown }).toImmutable()
          : child;
      map.set(key as TKey, immutable as ToImmutable<TValue>);
    }
    return map;
  }

  [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
    return this.entries();
  }

  // -- Write delegation --

  set(key: TKey, value: TValue): void {
    this._owner.mapSet(this._nodeId, key, toPlain(value));
  }

  delete(key: TKey): boolean {
    this._owner.mapDelete(this._nodeId, key);
    return true;
  }

  clone(): JsLiveMap<TKey, TValue> {
    const rawEntries = this._owner.mapEntries(this._nodeId);
    const entries: [TKey, TValue][] = rawEntries.map(([key, entry]) => {
      const value = resolveEntry(this._owner, entry);
      const cloned =
        value !== null &&
        typeof value === "object" &&
        "clone" in value &&
        typeof (value as Record<string, unknown>).clone === "function"
          ? (value as { clone(): unknown }).clone()
          : value;
      return [key as TKey, cloned as TValue];
    });
    return new JsLiveMap(entries);
  }
}
