/**
 * WASM-backed LiveObject implementation.
 *
 * Holds a reference to a CrdtDocumentOwner + nodeId and delegates all
 * operations to the WASM document. Structurally compatible with the JS
 * LiveObject class via TypeScript's duck typing.
 */

import type { CrdtDocumentOwner } from "./impl-selector";
import { LiveObject as JsLiveObject } from "./LiveObject";
import type { Lson, LsonObject } from "./Lson";
import type { ToImmutable } from "./utils";
import { resolveEntry, toPlain, toPlainObject, makeParentInfo } from "./wasm-live-helpers";

export class WasmLiveObject<O extends LsonObject = LsonObject> {
  /** @internal */
  readonly _owner: CrdtDocumentOwner;
  /** @internal */
  readonly _nodeId: string;

  constructor(owner: CrdtDocumentOwner, nodeId: string) {
    this._owner = owner;
    this._nodeId = nodeId;
  }

  /**
   * The room ID if this node is attached to a room, or null if detached.
   * Matches JS LiveObject.roomId behavior.
   */
  get roomId(): string | null {
    // Check if node still exists in the document
    if (this._owner.getNodeType(this._nodeId) !== undefined) {
      return (
        (this._owner as unknown as Record<string, unknown>)._roomId as
          | string
          | undefined
      ) ?? null;
    }
    return null;
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
    const entries = this._owner.objectEntries(this._nodeId);
    const result: Record<string, unknown> = {};
    for (const [key, entry] of entries) {
      const child = resolveEntry(this._owner, entry);
      result[key] =
        child !== null &&
        typeof child === "object" &&
        "toImmutable" in child &&
        typeof (child as Record<string, unknown>).toImmutable === "function"
          ? (child as { toImmutable(): unknown }).toImmutable()
          : child;
    }
    return result as ToImmutable<O>;
  }

  // -- Write delegation --

  set<TKey extends keyof O>(key: TKey, value: O[TKey]): void {
    if (value === undefined) {
      this._owner.objectDelete(this._nodeId, key as string);
    } else {
      this._owner.objectUpdate(this._nodeId, { [key]: toPlain(value) });
    }
  }

  update(patch: Partial<O>): void {
    const dataToUpdate: Record<string, unknown> = {};
    const keysToDelete: string[] = [];
    for (const [key, value] of Object.entries(
      patch as Record<string, unknown>
    )) {
      if (value === undefined) {
        keysToDelete.push(key);
      } else {
        dataToUpdate[key] = toPlain(value);
      }
    }
    if (Object.keys(dataToUpdate).length > 0) {
      this._owner.objectUpdate(this._nodeId, dataToUpdate);
    }
    for (const key of keysToDelete) {
      this._owner.objectDelete(this._nodeId, key);
    }
  }

  delete(key: keyof O): void {
    this._owner.objectDelete(this._nodeId, key as string);
  }

  clone(): JsLiveObject<O> {
    const entries = this._owner.objectEntries(this._nodeId);
    const data: Record<string, unknown> = {};
    for (const [key, entry] of entries) {
      const value = resolveEntry(this._owner, entry);
      data[key] =
        value !== null &&
        typeof value === "object" &&
        "clone" in value &&
        typeof (value as Record<string, unknown>).clone === "function"
          ? (value as { clone(): unknown }).clone()
          : value;
    }
    return new JsLiveObject(data as O);
  }
}
