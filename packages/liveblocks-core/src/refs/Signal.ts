// XXX REMOVE THIS ESLINT SUPPRESSION
/* eslint-disable */
import type {
  Callback,
  EventSource,
  Observable,
  UnsubscribeCallback,
} from "../lib/EventSource";
import { makeEventSource } from "../lib/EventSource";
import { freeze } from "../lib/freeze";
import type { JsonObject } from "../lib/Json";
import { compactObject, raise } from "../lib/utils";
import { merge } from "./ImmutableRef";

let signalId = 1;

abstract class ReadonlySignal<T> implements Observable<void> {
  public name: string = `Signal${signalId++}`; // XXX Remove this after debugging

  protected equals: (a: T, b: T) => boolean;
  #eventSource: EventSource<void>;
  #sinks: Set<DerivedSignal<unknown>>;

  constructor(equals?: (a: T, b: T) => boolean) {
    this.equals = equals ?? Object.is;
    this.#eventSource = makeEventSource<void>();
    this.#sinks = new Set();
  }

  [Symbol.dispose](): void {
    this.#eventSource[Symbol.dispose]();

    // @ts-expect-error make disposed object completely unusable
    this.#eventSource = null;
    // @ts-expect-error make disposed object completely unusable
    this.equals = null;
  }

  // Concrete subclasses implement this method in different ways
  abstract get(): T;

  get hasWatchers(): boolean {
    return this.#eventSource.count() > 0;
  }

  protected notify(): void {
    this.#eventSource.notify();
  }

  subscribe(callback: Callback<void>): UnsubscribeCallback {
    return this.#eventSource.subscribe(callback);
  }

  subscribeOnce(callback: Callback<void>): UnsubscribeCallback {
    const unsub = this.subscribe(() => {
      unsub();
      return callback();
    });
    return unsub;
  }

  waitUntil(): never {
    throw new Error("waitUntil not supported on Signals");
  }

  markSinksDirty(): void {
    for (const sink of this.#sinks) {
      sink.markDirty();
    }
  }

  addSink(sink: DerivedSignal<unknown>): void {
    this.#sinks.add(sink);
  }

  removeSink(sink: DerivedSignal<unknown>): void {
    this.#sinks.delete(sink);
  }
}

// NOTE: This class is pretty similar to the Signal.State proposal
export class Signal<T> extends ReadonlySignal<T> {
  #value: T;

  constructor(value: T, equals?: (a: T, b: T) => boolean) {
    super(equals);
    this.#value = freeze(value);
  }

  [Symbol.dispose](): void {
    super[Symbol.dispose]();

    // @ts-expect-error make disposed object completely unusable
    this.#value = null;
  }

  get(): T {
    return this.#value;
  }

  set(newValue: T | ((oldValue: T) => T)): void {
    if (typeof newValue === "function") {
      newValue = (newValue as (oldValue: T) => T)(this.#value);
    }
    if (!this.equals(this.#value, newValue)) {
      this.#value = freeze(newValue);
      this.markSinksDirty();
      this.notify();
    }
  }
}

export class PatchableSignal<J extends JsonObject> extends Signal<J> {
  constructor(data: J) {
    super(freeze(compactObject(data)));
  }

  set(): void {
    throw new Error("Don't call .set() directly, use .patch()");
  }

  /**
   * Patches the current object.
   */
  patch(patch: Partial<J>): void {
    super.set((old) => merge(old, patch));
  }
}

/**
 * Placeholder for a deferred computation that has yet to happen on-demand in
 * the future.
 */
const INITIAL = Symbol();

// NOTE: This class is pretty similar to the Signal.Computed proposal
export class DerivedSignal<T> extends ReadonlySignal<T> {
  #prevValue: T;
  #dirty: boolean; // When true, the value in #value may not be up-to-date and needs re-checking
  #event: EventSource<void>;

  #parents: readonly ReadonlySignal<unknown>[];
  #transform: (...values: unknown[]) => T;

  #unlinkFromParents?: UnsubscribeCallback;

  // Overload 1
  static from<Ts extends [unknown, ...unknown[]], V>(...args: [...signals: { [K in keyof Ts]: ReadonlySignal<Ts[K]> }, transform: (...values: Ts) => V]): DerivedSignal<V>; // prettier-ignore
  // Overload 2
  static from<Ts extends [unknown, ...unknown[]], V>(...args: [...signals: { [K in keyof Ts]: ReadonlySignal<Ts[K]> }, transform: (...values: Ts) => V, equals: (a: V, b: V) => boolean]): DerivedSignal<V>; // prettier-ignore
  static from<Ts extends [unknown, ...unknown[]], V>(
    // prettier-ignore
    ...args: [
      ...signals: { [K in keyof Ts]: ReadonlySignal<Ts[K]> },
      transform: (...values: Ts) => V,
      equals?: (a: V, b: V) => boolean,
    ]
  ): DerivedSignal<V> {
    const last = args.pop();
    if (typeof last !== "function")
      raise("Invalid .from() call, last argument expected to be a function");

    if (typeof args[args.length - 1] === "function") {
      // Overload 2
      const equals = last as (a: V, b: V) => boolean;
      const transform = args.pop() as (...values: unknown[]) => V;
      return new DerivedSignal(
        args as ReadonlySignal<unknown>[],
        transform,
        equals
      );
    } else {
      // Overload 1
      const transform = last as (...values: unknown[]) => V;
      return new DerivedSignal(args as ReadonlySignal<unknown>[], transform);
    }
  }

  private constructor(
    parents: ReadonlySignal<unknown>[],
    transform: (...values: unknown[]) => T,
    equals?: (a: T, b: T) => boolean
  ) {
    super(equals);
    this.#dirty = true;
    this.#prevValue = INITIAL as unknown as T;
    this.#event = makeEventSource<void>();
    this.#parents = parents;
    this.#transform = transform;

    for (const parent of parents) {
      parent.addSink(this as DerivedSignal<unknown>);
    }
  }

  [Symbol.dispose](): void {
    for (const parent of this.#parents) {
      parent.removeSink(this as DerivedSignal<unknown>);
    }

    this.#event[Symbol.dispose]();

    // @ts-expect-error make disposed object completely unusable
    this.#prevValue = INITIAL;
    // @ts-expect-error make disposed object completely unusable
    this.#event = null;
    // @ts-expect-error make disposed object completely unusable
    this.#parents = null;
    // @ts-expect-error make disposed object completely unusable
    this.#transform = null;
  }

  get isDirty(): boolean {
    return this.#dirty;
  }

  get hasWatchers(): boolean {
    return this.#event.count() > 0;
  }

  #recompute(): boolean {
    const derived = this.#transform(...this.#parents.map((p) => p.get()));
    this.#dirty = false;

    // Only emit a change to watchers if the value actually changed
    if (!this.equals(this.#prevValue, derived)) {
      this.#prevValue = derived;
      return true;
    }
    return false;
  }

  markDirty(): void {
    this.#dirty = true;
    this.markSinksDirty();
  }

  get(): T {
    if (this.#dirty) {
      this.#recompute();
    }
    return this.#prevValue;
  }

  #linkUpToParents(): void {
    this.#unlinkFromParents?.();

    const unsubs = this.#parents.map((parent) => {
      return parent.subscribe(() => {
        // Re-evaluate the current derived signal's value and if needed,
        // notify sinks. At this point, all sinks should already have been
        // marked dirty, so we won't have to do that again here now.
        const updated = this.#recompute();
        if (updated) {
          this.#event.notify();
        }
      });
    });

    this.#unlinkFromParents = () => {
      this.#unlinkFromParents = undefined;
      for (const unsub of unsubs) {
        try {
          unsub();
        } catch {
          // Ignore
        }
      }
    };
  }

  subscribe(callback: Callback<void>): UnsubscribeCallback {
    // A DerivedSignal can be pulled on-demand with .get(), but if it's being
    // subscribed to, then we need to set up a watcher on all of its parents as
    // well.
    if (!this.hasWatchers) {
      this.#linkUpToParents();
    }

    const unsub = this.#event.subscribe(callback);
    return () => {
      unsub();

      // If the last watcher unsubscribed, unlink this Signal from its parents'
      if (!this.hasWatchers) {
        this.#unlinkFromParents?.();
      }
    };
  }
}
