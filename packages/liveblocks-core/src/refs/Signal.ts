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

abstract class ReadableSignal<T> implements Observable<void> {
  protected readonly equals: (a: T, b: T) => boolean;
  private readonly eventSource: EventSource<void>;
  private readonly sinks: Set<DerivedSignal<unknown>>;

  constructor(equals?: (a: T, b: T) => boolean) {
    this.equals = equals ?? Object.is;
    this.eventSource = makeEventSource<void>();
    this.sinks = new Set();

    // Auto-bind common methods
    this.get = this.get.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.subscribeOnce = this.subscribeOnce.bind(this);
  }

  [Symbol.dispose](): void {
    this.eventSource[Symbol.dispose]();

    // @ts-expect-error make disposed object completely unusable
    this.eventSource = "(disposed)";
    // @ts-expect-error make disposed object completely unusable
    this.equals = "(disposed)";
  }

  // Concrete subclasses implement this method in different ways
  abstract get(): T;

  get hasWatchers(): boolean {
    return this.eventSource.count() > 0;
  }

  protected notify(): void {
    this.eventSource.notify();
  }

  subscribe(callback: Callback<void>): UnsubscribeCallback {
    return this.eventSource.subscribe(callback);
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
    for (const sink of this.sinks) {
      sink.markDirty();
    }
  }

  addSink(sink: DerivedSignal<unknown>): void {
    this.sinks.add(sink);
  }

  removeSink(sink: DerivedSignal<unknown>): void {
    this.sinks.delete(sink);
  }
}

// NOTE: This class is pretty similar to the Signal.State proposal
export class Signal<T> extends ReadableSignal<T> {
  private value: T;

  constructor(value: T, equals?: (a: T, b: T) => boolean) {
    super(equals);
    this.value = freeze(value);
  }

  [Symbol.dispose](): void {
    super[Symbol.dispose]();
    // @ts-expect-error make disposed object completely unusable
    this.value = "(disposed)";
  }

  get(): T {
    return this.value;
  }

  set(newValue: T | ((oldValue: T) => T)): void {
    if (typeof newValue === "function") {
      newValue = (newValue as (oldValue: T) => T)(this.value);
    }
    if (!this.equals(this.value, newValue)) {
      this.value = freeze(newValue);
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
export class DerivedSignal<T> extends ReadableSignal<T> {
  private prevValue: T;
  private dirty: boolean; // When true, the value in #value may not be up-to-date and needs re-checking

  private readonly parents: readonly ReadableSignal<unknown>[];
  private readonly transform: (...values: unknown[]) => T;

  private unlinkFromParents?: UnsubscribeCallback;

  // Overload 1
  static from<Ts extends [unknown, ...unknown[]], V>(...args: [...signals: { [K in keyof Ts]: ReadableSignal<Ts[K]> }, transform: (...values: Ts) => V]): DerivedSignal<V>; // prettier-ignore
  // Overload 2
  static from<Ts extends [unknown, ...unknown[]], V>(...args: [...signals: { [K in keyof Ts]: ReadableSignal<Ts[K]> }, transform: (...values: Ts) => V, equals: (a: V, b: V) => boolean]): DerivedSignal<V>; // prettier-ignore
  static from<Ts extends [unknown, ...unknown[]], V>(
    // prettier-ignore
    ...args: [
      ...signals: { [K in keyof Ts]: ReadableSignal<Ts[K]> },
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
        args as ReadableSignal<unknown>[],
        transform,
        equals
      );
    } else {
      // Overload 1
      const transform = last as (...values: unknown[]) => V;
      return new DerivedSignal(args as ReadableSignal<unknown>[], transform);
    }
  }

  private constructor(
    parents: ReadableSignal<unknown>[],
    transform: (...values: unknown[]) => T,
    equals?: (a: T, b: T) => boolean
  ) {
    super(equals);
    this.dirty = true;
    this.prevValue = INITIAL as unknown as T;
    this.parents = parents;
    this.transform = transform;

    for (const parent of parents) {
      parent.addSink(this as DerivedSignal<unknown>);
    }
  }

  [Symbol.dispose](): void {
    for (const parent of this.parents) {
      parent.removeSink(this as DerivedSignal<unknown>);
    }

    // @ts-expect-error make disposed object completely unusable
    this.prevValue = "(disposed)";
    // @ts-expect-error make disposed object completely unusable
    this.parents = "(disposed)";
    // @ts-expect-error make disposed object completely unusable
    this.transform = "(disposed)";
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  private recompute(): boolean {
    const derived = this.transform(...this.parents.map((p) => p.get()));
    this.dirty = false;

    // Only emit a change to watchers if the value actually changed
    if (!this.equals(this.prevValue, derived)) {
      this.prevValue = derived;
      return true;
    }
    return false;
  }

  markDirty(): void {
    if (!this.dirty) {
      this.dirty = true;
      this.markSinksDirty();
    }
  }

  get(): T {
    if (this.dirty) {
      this.recompute();
    }
    return this.prevValue;
  }

  private linkUpToParents(): void {
    this.unlinkFromParents?.();

    const unsubs = this.parents.map((parent) => {
      return parent.subscribe(() => {
        // Re-evaluate the current derived signal's value and if needed,
        // notify sinks. At this point, all sinks should already have been
        // marked dirty, so we won't have to do that again here now.
        const updated = this.recompute();
        if (updated) {
          this.notify();
        }
      });
    });

    this.unlinkFromParents = () => {
      this.unlinkFromParents = undefined;
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
      this.linkUpToParents();
    }

    const unsub = super.subscribe(callback);
    return () => {
      unsub();

      // If the last watcher unsubscribed, unlink this Signal from its parents'
      if (!this.hasWatchers) {
        this.unlinkFromParents?.();
      }
    };
  }
}

/**
 * A MutableSignal is a bit like Signal, except its state is managed by
 * a single value whose reference does not change but is mutated.
 *
 * Similar to how useSyncExternalState() works in React, there is a way to read
 * the current state at any point in time synchronously, and a way to update
 * its reference.
 */
export class MutableSignal<T extends object> extends ReadableSignal<T> {
  private readonly state: T;

  constructor(initialState: T) {
    super();
    this.state = initialState;
  }

  [Symbol.dispose](): void {
    super[Symbol.dispose]();
    // @ts-expect-error make disposed object completely unusable
    this.state = "(disposed)";
  }

  get(): T {
    return this.state;
  }

  /**
   * Invokes a callback function that is allowed to mutate the given state
   * value. Do not change the value outside of the callback.
   *
   * If the callback explicitly returns `false`, it's assumed that the state
   * was not changed.
   */
  mutate(callback: (state: T) => unknown): void {
    const result = callback(this.state);
    if (result !== null && typeof result === "object" && "then" in result) {
      raise("MutableSignal.mutate() does not support async callbacks");
    }

    if (result !== false) {
      this.markSinksDirty();
      this.notify();
    }
  }

  // XXX Add a batch API here as well
  // XXX Think about whether batch would only belong on this class or on the Signal
  //     class as well?
  // XXX DRY up the 'Store' class
}
