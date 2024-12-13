import type {
  Callback,
  EventSource,
  Observable,
  UnsubscribeCallback,
} from "../lib/EventSource";
import { makeEventSource } from "../lib/EventSource";

// XXX Remove when unused now
export abstract class ImmutableRef<T> {
  /** @internal */
  private _cache:
    | Readonly<T>
    | undefined // `undefined` initially
    | null; // `null` after explicit invalidate()

  /** @internal */
  private _ev: EventSource<void>;

  constructor() {
    this._ev = makeEventSource<void>();
  }

  /** @internal */
  protected abstract _toImmutable(): Readonly<T>;

  protected notify(): void {
    if (this._cache !== null) {
      this._cache = null;
      this._ev.notify();
    }
  }

  get(): Readonly<T> {
    return this._cache ?? (this._cache = this._toImmutable());
  }

  get observable(): Observable<void> {
    return this._ev.observable;
  }

  subscribe(callback: Callback<void>): UnsubscribeCallback {
    return this._ev.observable.subscribe(callback);
  }
}
