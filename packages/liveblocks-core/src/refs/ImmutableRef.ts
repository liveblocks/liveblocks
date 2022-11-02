import type { EventSource, Observable } from "../lib/EventSource";
import { makeEventSource } from "../lib/EventSource";

/**
 * Patches a target object by "merging in" the provided fields. Patch
 * fields that are explicitly-undefined will delete keys from the target
 * object. Will return a new object.
 *
 * Important guarantee:
 * If the patch effectively did not mutate the target object because the
 * patch fields have the same value as the original, then the original
 * object reference will be returned.
 */
export function merge<T>(target: T, patch: Partial<T>): T {
  let updated = false;
  const newValue = { ...target };

  Object.keys(patch).forEach((k) => {
    const key = k as keyof T;
    const val = patch[key];
    if (newValue[key] !== val) {
      if (val === undefined) {
        delete newValue[key];
      } else {
        newValue[key] = val as T[keyof T];
      }
      updated = true;
    }
  });

  return updated ? newValue : target;
}

/**
 * Base class that implements an immutable cache.
 *
 * TODO: Document usage.
 */
export abstract class ImmutableRef<T> {
  /** @internal */
  private _cache: Readonly<T> | undefined;

  /** @internal */
  private _ev: EventSource<void>;

  constructor() {
    this._ev = makeEventSource<void>();
  }

  get didInvalidate(): Observable<void> {
    return this._ev.observable;
  }

  /** @internal */
  protected abstract _toImmutable(): Readonly<T>;

  protected invalidate(): void {
    if (this._cache !== undefined) {
      this._cache = undefined;
      this._ev.notify();
    }
  }

  get current(): Readonly<T> {
    return this._cache ?? (this._cache = this._toImmutable());
  }
}
