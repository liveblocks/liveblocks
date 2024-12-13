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

  constructor(equals?: (a: T, b: T) => boolean) {
    this.equals = equals ?? Object.is;
    this.#eventSource = makeEventSource<void>();
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
}

// NOTE: This class is pretty similar to the Signal.State proposal
export class Signal<T> extends ReadonlySignal<T> {
  #value: T;

  constructor(value: T, equals?: (a: T, b: T) => boolean) {
    super(equals);
    this.#value = value;
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
      this.#value = newValue;
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
    super.set((old) => freeze(merge(old, patch)));
  }
}

/**
 * Placeholder for a deferred computation that has yet to happen on-demand in
 * the future.
 */
const PLACEHOLDER = Symbol();

// NOTE: This class is pretty similar to the Signal.Computed proposal
export class DerivedSignal<T> extends ReadonlySignal<T> {
  #value: T;
  #dirty: boolean;
  #event: EventSource<void>;

  #parents: readonly ReadonlySignal<unknown>[];
  #transform: (...values: unknown[]) => T;
  #unlinkFromParents?: () => void;

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
    this.#value = PLACEHOLDER as unknown as T;
    this.#event = makeEventSource<void>();
    this.#parents = parents;
    this.#transform = transform;
  }

  [Symbol.dispose](): void {
    this.#unlinkFromParents?.();
    this.#event[Symbol.dispose]();

    // @ts-expect-error make disposed object completely unusable
    this.#value = null;
    // @ts-expect-error make disposed object completely unusable
    this.#event = null;
    // @ts-expect-error make disposed object completely unusable
    this.#parents = null;
    // @ts-expect-error make disposed object completely unusable
    this.#transform = null;
  }

  get hasWatchers(): boolean {
    return this.#event.count() > 0;
  }

  #recompute(): void {
    const derived = this.#transform(...this.#parents.map((p) => p.get()));

    //
    // We just recomputed the value! But what to do with the dirty flag?
    // It depends! If we are linked up to the parent signal, we can guarantee
    // that the parent will inform us about updates to the source values.
    //
    // In that case, we can safely mark the derived value as clean, because if
    // any of the parents will update, it will get marked as dirty
    // automatically.
    //
    // If, however, we are not linked up to the parent signal, we have no way
    // to know when a source changes. In that case, the best we can do is to
    // mark the value as dirty. This will force a recompute on the next read.
    //
    this.#dirty = this.#unlinkFromParents === undefined;

    // Only emit a change to watchers if the value actually changed
    if (!this.equals(this.#value, derived)) {
      this.#value = derived;
      this.#event.notify();
    }
  }

  get(): T {
    if (this.#dirty) {
      this.#recompute();
    }
    return this.#value;
  }

  #hookup(): void {
    const unsubs = this.#parents.map((parent) => {
      globalThis.console.log(
        `🔗 Linking derived signal '${this.name}' to parent signal '${parent.name}'!`
      );
      return [
        parent.name,
        parent.subscribe(() => {
          globalThis.console.info(
            `🔄 [inside '${this.name}'] Parent signal '${parent.name}' changed!`
          );
          this.#dirty = true;
        }),
      ] as const;
    });

    this.#unlinkFromParents = () => {
      this.#unlinkFromParents = undefined;

      this.#dirty = true;
      for (const [parentName, unsub] of unsubs) {
        try {
          globalThis.console.log(
            `🔗 Unlinking derived signal '${this.name}' from parent '${parentName}'!`
          );
          unsub();
        } catch {
          // Ignore
        }
      }
    };
  }

  subscribe(callback: Callback<void>): UnsubscribeCallback {
    const hadWatchersBefore = this.hasWatchers;
    const unsub = this.#event.subscribe(callback);

    // If this is the first subscriber, link the Signal up to the parent!
    if (!hadWatchersBefore) {
      this.#hookup();
    }

    return () => {
      unsub();

      // If this was the last subscriber unlinking, also unlink this
      // signal from its parent, so it can be garbage collected.
      if (!this.hasWatchers) {
        this.#unlinkFromParents?.();
      }
    };
  }
}

// XXX Move this test code to a real test
{
  const log = globalThis.console.log;

  const multiplier = new Signal(0);
  multiplier.name = "multiplier";
  const todos = new Signal(["Ha", "Buy milk", "Clean the house"]);
  todos.name = "todos";
  const count = DerivedSignal.from(
    todos,
    multiplier,
    (todos, times) => todos.length * times
  );
  count.name = "count";

  const isEven = DerivedSignal.from(count, (count) => {
    const rv = count % 2 === 0;
    log(`isEven RECOMPUTED based off of ${count} to be:`, rv);
    return rv;
  });
  isEven.name = "isEven";

  const todosSub = todos.subscribe(() =>
    log(`List changed: ${todos.get().join(", ")}`)
  );
  const countSub = count.subscribe(() => log(`Count changed: ${count.get()}`));
  const isEvenSub = isEven.subscribe(() =>
    log(`isEven changed: ${isEven.get()}`)
  );

  log({
    todos: todos.get(),
    multiplier: multiplier.get(),
    count: count.get(),
    isEven: isEven.get(),
    isEven2: isEven.get(),
    isEven3: isEven.get(),
    isEven4: isEven.get(),
    isEven5: isEven.get(),
    isEven6: isEven.get(),
  });

  todos.set([...todos.get(), "Do laundry"]);
  multiplier.set(1);
  todos.set((todos) => todos.splice(1));
  multiplier.set(2);

  log({
    todos: todos.get(),
    multiplier: multiplier.get(),
    count: count.get(),
    isEven: isEven.get(),
    isEven2: isEven.get(),
    isEven3: isEven.get(),
    isEven4: isEven.get(),
    isEven5: isEven.get(),
    isEven6: isEven.get(),
  });

  multiplier.set(3);

  log({
    todos: todos.get(),
    multiplier: multiplier.get(),
    count: count.get(),
    isEven: isEven.get(),
    isEven2: isEven.get(),
  });

  console.log("x", isEven.get());
  todos.set((todos) => todos.slice());
  console.log("y", isEven.get());

  // x();
  countSub();
  todosSub();
  isEvenSub();

  log("done");
}
