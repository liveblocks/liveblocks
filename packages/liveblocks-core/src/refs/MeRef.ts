import { freeze } from "../lib/freeze";
import type { JsonObject } from "../lib/Json";
import { compactObject } from "../lib/utils";
import { ImmutableRef, merge } from "./ImmutableRef";

/**
 * Managed immutable cache for accessing "me" presence data as read-only.
 */
export class MeRef<
  TPresence extends JsonObject
> extends ImmutableRef<TPresence> {
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
