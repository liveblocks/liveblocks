/**
 * WASM-backed LiveObject implementation.
 *
 * Holds a reference to a CrdtDocumentOwner + nodeId and delegates all
 * operations to the WASM document. Structurally compatible with the JS
 * LiveObject class via TypeScript's duck typing.
 */

import type { CrdtDocumentOwner } from "./impl-selector";
import type { Lson, LsonObject } from "./Lson";
import type { ToImmutable } from "./utils";
import { resolveEntry } from "./wasm-live-helpers";

export class WasmLiveObject<O extends LsonObject = LsonObject> {
  /** @internal */
  readonly _owner: CrdtDocumentOwner;
  /** @internal */
  readonly _nodeId: string;

  constructor(owner: CrdtDocumentOwner, nodeId: string) {
    this._owner = owner;
    this._nodeId = nodeId;
  }

  // -- Read delegation --

  get<TKey extends keyof O>(key: TKey): O[TKey] {
    const entry = this._owner.objectGetEntry(this._nodeId, key as string);
    if (entry === undefined) {
      return undefined as O[TKey];
    }
    return resolveEntry(this._owner, entry) as O[TKey];
  }

  toObject(): O {
    const entries = this._owner.objectEntries(this._nodeId);
    const result: Record<string, Lson> = {};
    for (const [key, entry] of entries) {
      result[key] = resolveEntry(this._owner, entry);
    }
    return result as O;
  }

  toImmutable(): ToImmutable<O> {
    return this._owner.objectToImmutable(this._nodeId) as ToImmutable<O>;
  }

  // -- Write delegation --

  set<TKey extends keyof O>(key: TKey, value: O[TKey]): void {
    this._owner.objectUpdate(this._nodeId, { [key]: value });
  }

  update(patch: Partial<O>): void {
    this._owner.objectUpdate(this._nodeId, patch);
  }

  delete(key: keyof O): void {
    this._owner.objectDelete(this._nodeId, key as string);
  }
}
