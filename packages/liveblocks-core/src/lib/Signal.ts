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

const kSinks = Symbol("kSinks");
const kNotify = Symbol("kNotify");

//
// Before the batch is run, all sinks (recursively all the way down) are marked
// dirty. This already is enough if all we ever used were .get() calls.
//
// However, to ensure active subscription notifications also work, we need to
// keep track of which Signals to notify. Any time the value of a Signal
// changes, it will trigger an event to all subscribers, but in addition, it
// will also
//
// That's different from what an "active batch" keeps track of.
//
// While a batch is active, it keeps track of all the sinks that will have to
// be notified, because values _actually_ changed.
//
//
//
let activeBatch: {
  toNotify: Set<AbstractSignal<any>>;
} | null = null;

/**
 * Runs a callback function which can change multiple signals. At the end
 * of the batch, all derived signals will be notified.
 *
 * Nesting batches has no effect, the outermost batch will be the one
 * that triggers the notification.
 */
export function batch(callback: Callback<void>): void {
  if (activeBatch !== null) {
    // Already inside another batch, just run this inner callback
    callback();
    return;
  }

  activeBatch = {
    toNotify: new Set(),
  };
  try {
    callback();
  } finally {
    for (const signal of activeBatch.toNotify) {
      signal[kNotify]();
    }
    activeBatch = null;
  }
}

/**
 * Ensures that the signal will be notified at the end of the current batch.
 * This should only be called within a batch callback. It's safe to call this
 * while notifications are being rolled out.
 */
function enqueueNotify(signal: AbstractSignal<any>) {
  if (!activeBatch) raise("Expected to be in an active batch");
  activeBatch.toNotify.add(signal);
}

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

export interface ISignal<T> {
  get(): T;
  subscribe(callback: Callback<void>): UnsubscribeCallback;
  addSink(sink: DerivedSignal<unknown>): void;
  removeSink(sink: DerivedSignal<unknown>): void;
}

/**
 * Base functionality every Signal implementation needs.
 */
abstract class AbstractSignal<T> implements ISignal<T>, Observable<void> {
  /** @internal */
  protected readonly equals: (a: T, b: T) => boolean;
  /** @internal */
  private readonly eventSource: EventSource<void>;
  /** @internal */
  public readonly [kSinks]: Set<DerivedSignal<unknown>>;

  constructor(equals?: (a: T, b: T) => boolean) {
    this.equals = equals ?? Object.is;
    this.eventSource = makeEventSource<void>();
    this[kSinks] = new Set();

    // Bind common methods to self
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
    if (this.eventSource.count() > 0) return true;

    for (const sink of this[kSinks]) {
      if (sink.hasWatchers) {
        return true;
      }
    }

    return false;
  }

  public [kNotify](): void {
    this.eventSource.notify();

    // While the active batch chain is being notified, add more elements to
    // the active batch
    for (const sink of this[kSinks]) {
      enqueueNotify(sink);
    }
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
    for (const sink of this[kSinks]) {
      sink.markDirty();
    }
  }

  addSink(sink: DerivedSignal<unknown>): void {
    this[kSinks].add(sink);
  }

  removeSink(sink: DerivedSignal<unknown>): void {
    this[kSinks].delete(sink);
  }
}

// NOTE: This class is pretty similar to the Signal.State proposal
export class Signal<T> extends AbstractSignal<T> {
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
    batch(() => {
      if (typeof newValue === "function") {
        newValue = (newValue as (oldValue: T) => T)(this.value);
      }
      if (!this.equals(this.value, newValue)) {
        this.value = freeze(newValue);
        this.markSinksDirty();
        enqueueNotify(this);
      }
    });
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
export class DerivedSignal<T> extends AbstractSignal<T> {
  private prevValue: T;
  private dirty: boolean; // When true, the value in #value may not be up-to-date and needs re-checking

  private readonly parents: readonly ISignal<unknown>[];
  private readonly transform: (...values: unknown[]) => T;

  // Overload 1
  static from<Ts extends [unknown, ...unknown[]], V>(...args: [...signals: { [K in keyof Ts]: ISignal<Ts[K]> }, transform: (...values: Ts) => V]): DerivedSignal<V>; // prettier-ignore
  // Overload 2
  static from<Ts extends [unknown, ...unknown[]], V>(...args: [...signals: { [K in keyof Ts]: ISignal<Ts[K]> }, transform: (...values: Ts) => V, equals: (a: V, b: V) => boolean]): DerivedSignal<V>; // prettier-ignore
  static from<Ts extends [unknown, ...unknown[]], V>(
    // prettier-ignore
    ...args: [
      ...signals: { [K in keyof Ts]: ISignal<Ts[K]> },
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
      return new DerivedSignal(args as ISignal<unknown>[], transform, equals);
    } else {
      // Overload 1
      const transform = last as (...values: unknown[]) => V;
      return new DerivedSignal(args as ISignal<unknown>[], transform);
    }
  }

  private constructor(
    parents: ISignal<unknown>[],
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

  /**
   * Called by the Signal system if one or more of the dependent signals have
   * changed. In the case of a DerivedSignal, we'll only want to re-evaluate
   * the actual value if it's being watched, or any of their sinks are being
   * watched actively.
   */
  public [kNotify](): void {
    if (!this.hasWatchers) {
      // If there are no watchers for this signal, we don't need to
      // re-evaluate. We can postpone re-evaluation until the next .get() call.
      return;
    }

    // Re-evaluate the current derived signal's value and if needed,
    // notify sinks. At this point, all sinks should already have been
    // marked dirty, so we won't have to do that again here now.
    const updated = this.recompute();
    if (updated) {
      super[kNotify](); // Actually notify subscribers
    }
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
export class MutableSignal<T extends object> extends AbstractSignal<T> {
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
    batch(() => {
      const result = callback(this.state);
      if (result !== null && typeof result === "object" && "then" in result) {
        raise("MutableSignal.mutate() does not support async callbacks");
      }

      if (result !== false) {
        this.markSinksDirty();
        enqueueNotify(this);
      }
    });
  }
}
