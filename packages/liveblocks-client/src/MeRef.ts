import { ImmRef, merge } from "./ImmRef";
import type { JsonObject } from "./types";
import { compactObject, freeze } from "./utils";

/**
 * Managed immutable cache for accessing "me" presence data as read-only.
 */
export class MeRef<TPresence extends JsonObject> extends ImmRef<TPresence> {
  /** @internal */
  private _me: Readonly<TPresence>;

  constructor(initialPresence: TPresence) {
    super();
    this._me = freeze(compactObject(initialPresence));
  }

  /** @internal */
  _toImmutable(): Readonly<TPresence> {
    return this._me;
  }

  /**
   * Patches the current "me" instance.
   */
  patch(patch: Partial<TPresence>): void {
    const oldMe = this._me;
    const newMe = merge(oldMe, patch);
    if (oldMe !== newMe) {
      this._me = freeze(newMe);
      this.invalidate();
    }
  }
}
