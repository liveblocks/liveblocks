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
const kTrigger = Symbol("kTrigger");

//
// Before the batch is run, all sinks (recursively all the way down) are marked
// dirty. This already is enough if we only ever use .get() calls.
//
// However, to ensure active subscription notifications also work, we need to
// keep track of which Signals to notify. Any time the value of a Signal
// changes, the Signal itself will notify its own subscribers, but "sinks" are
// not "normal" subscribers.
//
// By treating sinks slightly differently, we can keep track of sink uniqueness
// across the entire signal network, ensuring a sink will only be notified once
// if more than one of its dependent Signals have changed.
//
// For example:
//
//      A
//    /   \
//   B     C
//    \   /
//      D - - - - ( has 1 normal subscriber )
//
// Here, B and C are sinks of A, and D is a sink of both B and C.
//
// Here's what will happen when A changes:
//
// - If A changes, then all sinks (B, C, and D) will be marked dirty.
//
// - Because some of A's sinks are being watched (in this case, D has at least
//   one subscriber), A will trigger B and C that its value has changed.
//
// - Both B and C re-evaluate and may or may not have changed. Three
//   possibilities:
//   1. Neither B and C have changed → D will *NOT* be triggered
//   2. Either B or C has changed    → D *will* be triggered
//   3. Both B and C have changed    → D *will* be triggered (but only once!)
//
// - If in the previous step D has been triggered, it will re-evaluate. If it
//   has changed itself, it will notify its normal subscriber.
//
let signalsToTrigger: Set<AbstractSignal<any>> | null = null;

//
// If a derived signal is currently being computed, there is a global "signals
// that have been read" registry that every call to `someSignal.get()` will
// register itself under.
//
let trackedReads: Set<AbstractSignal<any>> | null = null;

/**
 * Runs a callback function that is allowed to change multiple signals. At the
 * end of the batch, all changed signals will be notified (at most once).
 *
 * Nesting batches is supported.
 */
export function batch(callback: Callback<void>): void {
  if (signalsToTrigger !== null) {
    // Already inside another batch, just run this inner callback
    callback();
    return;
  }

  signalsToTrigger = new Set();
  try {
    callback();
  } finally {
    for (const signal of signalsToTrigger) {
      signal[kTrigger]();
    }
    signalsToTrigger = null;
  }
}

/**
 * Ensures that the signal will be notified at the end of the current batch.
 * This should only be called within a batch callback. It's safe to call this
 * while notifications are being rolled out.
 */
function enqueueTrigger(signal: AbstractSignal<any>) {
  if (!signalsToTrigger) raise("Expected to be in an active batch");
  signalsToTrigger.add(signal);
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

export type SignalType<S extends ISignal<any>> =
  S extends ISignal<infer T> ? T : never;

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
  readonly #eventSource: EventSource<void>;
  /** @internal */
  public readonly [kSinks]: Set<DerivedSignal<unknown>>;

  constructor(equals?: (a: T, b: T) => boolean) {
    this.equals = equals ?? Object.is;
    this.#eventSource = makeEventSource<void>();
    this[kSinks] = new Set();

    // Bind common methods to self
    this.get = this.get.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.subscribeOnce = this.subscribeOnce.bind(this);
  }

  [Symbol.dispose](): void {
    this.#eventSource[Symbol.dispose]();

    // @ts-expect-error make disposed object completely unusable
    this.#eventSource = "(disposed)";
    // @ts-expect-error make disposed object completely unusable
    this.equals = "(disposed)";
  }

  // Concrete subclasses implement this method in different ways
  abstract get(): T;

  get hasWatchers(): boolean {
    if (this.#eventSource.count() > 0) return true;

    for (const sink of this[kSinks]) {
      if (sink.hasWatchers) {
        return true;
      }
    }

    return false;
  }

  public [kTrigger](): void {
    this.#eventSource.notify();

    // While Signals are being triggered in the current unroll, we can enqueue
    // more signals to trigger (which will get added to the current unroll)
    for (const sink of this[kSinks]) {
      enqueueTrigger(sink);
    }
  }

  subscribe(callback: Callback<void>): UnsubscribeCallback {
    // If this is the first subscriber, we need to perform an initial .get()
    // now in case this is a DerivedSignal that has not been evaluated yet. The
    // reason we need to do this is that the .get() itself will register this
    // signal as sinks of the dependent signals, so we will actually get
    // notified here when one of the dependent signals changes.
    if (this.#eventSource.count() === 0) {
      this.get();
    }
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

  asReadonly(): ISignal<T> {
    return this;
  }
}

// NOTE: This class is pretty similar to the Signal.State proposal
export class Signal<T> extends AbstractSignal<T> {
  #value: T;

  constructor(value: T, equals?: (a: T, b: T) => boolean) {
    super(equals);
    this.#value = freeze(value);
  }

  [Symbol.dispose](): void {
    super[Symbol.dispose]();
    // @ts-expect-error make disposed object completely unusable
    this.#value = "(disposed)";
  }

  get(): T {
    trackedReads?.add(this);
    return this.#value;
  }

  set(newValue: T | ((oldValue: T) => T)): void {
    batch(() => {
      if (typeof newValue === "function") {
        newValue = (newValue as (oldValue: T) => T)(this.#value);
      }
      if (!this.equals(this.#value, newValue)) {
        this.#value = freeze(newValue);
        this.markSinksDirty();
        enqueueTrigger(this);
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
  #prevValue: T;
  #dirty: boolean; // When true, the value in #value may not be up-to-date and needs re-checking

  #sources: Set<ISignal<unknown>>;
  readonly #deps: readonly ISignal<unknown>[];
  readonly #transform: (...values: unknown[]) => T;

  // Overload 1
  static from<Ts extends unknown[], V>(...args: [...signals: { [K in keyof Ts]: ISignal<Ts[K]> }, transform: (...values: Ts) => V]): DerivedSignal<V>; // prettier-ignore
  // Overload 2
  static from<Ts extends unknown[], V>(...args: [...signals: { [K in keyof Ts]: ISignal<Ts[K]> }, transform: (...values: Ts) => V, equals: (a: V, b: V) => boolean]): DerivedSignal<V>; // prettier-ignore
  static from<Ts extends unknown[], V>(
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
    deps: ISignal<unknown>[],
    transform: (...values: unknown[]) => T,
    equals?: (a: T, b: T) => boolean
  ) {
    super(equals);
    this.#dirty = true;
    this.#prevValue = INITIAL as unknown as T;
    this.#deps = deps;
    this.#sources = new Set();
    this.#transform = transform;
  }

  [Symbol.dispose](): void {
    for (const src of this.#sources) {
      src.removeSink(this as DerivedSignal<unknown>);
    }

    // @ts-expect-error make disposed object completely unusable
    this.#prevValue = "(disposed)";
    // @ts-expect-error make disposed object completely unusable
    this.#sources = "(disposed)";
    // @ts-expect-error make disposed object completely unusable
    this.#deps = "(disposed)";
    // @ts-expect-error make disposed object completely unusable
    this.#transform = "(disposed)";
  }

  get isDirty(): boolean {
    return this.#dirty;
  }

  #recompute(): boolean {
    const oldTrackedReads = trackedReads;

    let derived;
    trackedReads = new Set();
    try {
      derived = this.#transform(...this.#deps.map((p) => p.get()));
    } finally {
      const oldSources = this.#sources;
      this.#sources = new Set();

      for (const sig of trackedReads) {
        this.#sources.add(sig);
        oldSources.delete(sig);
      }

      for (const oldSource of oldSources) {
        oldSource.removeSink(this as DerivedSignal<unknown>);
      }
      for (const newSource of this.#sources) {
        newSource.addSink(this as DerivedSignal<unknown>);
      }

      trackedReads = oldTrackedReads;
    }

    this.#dirty = false;

    // Only emit a change to watchers if the value actually changed
    if (!this.equals(this.#prevValue, derived)) {
      this.#prevValue = derived;
      return true;
    }
    return false;
  }

  markDirty(): void {
    if (!this.#dirty) {
      this.#dirty = true;
      this.markSinksDirty();
    }
  }

  get(): T {
    if (this.#dirty) {
      this.#recompute();
    }
    trackedReads?.add(this);
    return this.#prevValue;
  }

  /**
   * Called by the Signal system if one or more of the dependent signals have
   * changed. In the case of a DerivedSignal, we'll only want to re-evaluate
   * the actual value if it's being watched, or any of their sinks are being
   * watched actively.
   */
  public [kTrigger](): void {
    if (!this.hasWatchers) {
      // If there are no watchers for this signal, we don't need to
      // re-evaluate. We can postpone re-evaluation until the next .get() call.
      return;
    }

    // Re-evaluate the current derived signal's value and if needed,
    // notify sinks. At this point, all sinks should already have been
    // marked dirty, so we won't have to do that again here now.
    const updated = this.#recompute();
    if (updated) {
      super[kTrigger](); // Actually notify subscribers
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
  readonly #state: T;

  constructor(initialState: T) {
    super();
    this.#state = initialState;
  }

  [Symbol.dispose](): void {
    super[Symbol.dispose]();
    // @ts-expect-error make disposed object completely unusable
    this.#state = "(disposed)";
  }

  get(): T {
    trackedReads?.add(this);
    return this.#state;
  }

  /**
   * Invokes a callback function that is allowed to mutate the given state
   * value. Do not change the value outside of the callback.
   *
   * If the callback explicitly returns `false`, it's assumed that the state
   * was not changed.
   */
  mutate(callback?: (state: T) => void | boolean): void {
    batch(() => {
      const result = callback ? callback(this.#state) : true;
      if (result !== null && typeof result === "object" && "then" in result) {
        raise("MutableSignal.mutate() does not support async callbacks");
      }

      if (result !== false) {
        this.markSinksDirty();
        enqueueTrigger(this);
      }
    });
  }
}
