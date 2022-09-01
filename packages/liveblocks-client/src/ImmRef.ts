import type { EventSource, Observable } from "./EventSource";
import { makeEventSource } from "./EventSource";

/**
 * Base class that implements an immutable cache.
 *
 * TODO: Document usage.
 */
export abstract class ImmRef<T> {
  /** @internal */
  private _value: Readonly<T> | undefined;

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
    if (this._value !== undefined) {
      this._value = undefined;
      this._ev.notify();
    }
  }

  get current(): Readonly<T> {
    return this._value ?? (this._value = this._toImmutable());
  }
}
