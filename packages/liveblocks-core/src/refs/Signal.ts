/* eslint-disable */
import type {
  EventSource,
  Observable,
  UnsubscribeCallback,
} from "../lib/EventSource";
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

/* eslint-disable no-restricted-syntax */
interface ReadonlySignal<T> {
  name: string;
  hasWatchers: boolean;
  get(): T;
  subscribe(callback: () => void): () => void;
}

let signalId = 1;

export class Signal<T> implements ReadonlySignal<T> {
  public name: string = `Signal${signalId++}`;

  #equals: (a: T, b: T) => boolean;
  #value: T;
  #event: EventSource<void>;

  constructor(value: T, equals?: (a: T, b: T) => boolean) {
    this.#equals = equals ?? Object.is;
    this.#value = value;
    this.#event = makeEventSource<void>();
  }

  [Symbol.dispose](): void {
    this.#event[Symbol.dispose]();

    // @ts-expect-error make disposed object completely unusable
    this.#equals = null;
    // @ts-expect-error make disposed object completely unusable
    this.#value = null;
    // @ts-expect-error make disposed object completely unusable
    this.#event = null;

    globalThis.console.log("💥 Disposing signal!");
  }

  get hasWatchers(): boolean {
    return this.#event.count() > 0;
  }

  get(): T {
    return this.#value;
  }

  set(newValue: T | ((oldValue: T) => T)): void {
    if (typeof newValue === "function") {
      newValue = (newValue as (oldValue: T) => T)(this.#value);
    }
    if (!this.#equals(this.#value, newValue)) {
      this.#value = newValue;
      this.#event.notify();
    }
  }

  subscribe(callback: () => void): () => void {
    return this.#event.subscribe(callback);
  }
}

/**
 * Placeholder for a deferred computation that has yet to happen on-demand in
 * the future.
 */
const PLACEHOLDER = Symbol();

export class DerivedSignal<T> implements ReadonlySignal<T> {
  public name: string = `DerivedSignal${signalId++}`;

  #equals: (a: T, b: T) => boolean;
  #value: T;
  #dirty: boolean;
  #event: EventSource<void>;

  #parents: readonly ReadonlySignal<unknown>[];
  #transform: (...values: unknown[]) => T;
  #unlinkFromParents?: () => void;

  private constructor(
    parents: ReadonlySignal<unknown>[],
    transform: (...values: unknown[]) => T,
    equals?: (a: T, b: T) => boolean
  ) {
    this.#equals = equals ?? Object.is;
    this.#dirty = true;
    this.#value = PLACEHOLDER as unknown as T;
    this.#event = makeEventSource<void>();
    this.#parents = parents;
    this.#transform = transform;
  }

  static from<Ts extends [unknown, ...unknown[]], V>(
    ...args: [
      ...signals: { [K in keyof Ts]: ReadonlySignal<Ts[K]> },
      transform: (...values: Ts) => V,
    ]
  ): DerivedSignal<V> {
    const transform = args.pop() as (...values: unknown[]) => V;
    return new DerivedSignal(args as ReadonlySignal<unknown>[], transform);
  }

  static fromWithEquals<Ts extends [unknown, ...unknown[]], V>(
    ...args: [
      ...signals: { [K in keyof Ts]: ReadonlySignal<Ts[K]> },
      transform: (...values: Ts) => V,
      equals: (a: V, b: V) => boolean,
    ]
  ): DerivedSignal<V> {
    const equals = args.pop() as (a: V, b: V) => boolean;
    const transform = args.pop() as (...values: unknown[]) => V;
    return new DerivedSignal(
      args as ReadonlySignal<unknown>[],
      transform,
      equals
    );
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

    globalThis.console.log("💥 Disposing derived signal!");
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
    if (!this.#equals(this.#value, derived)) {
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

  subscribe(callback: () => void): UnsubscribeCallback {
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

// {
//   function hashIntegers(arr: number[]) {
//     // Validate input
//     if (!Array.isArray(arr) || arr.length > 10) {
//       throw new Error("Input must be an array with up to 10 positive integers");
//     }
//
//     // Use a prime-based multiplication approach
//     const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
//
//     return arr
//       .map((num, index) => {
//         // Validate each number
//         if (!Number.isInteger(num) || num <= 0) {
//           throw new Error("All elements must be positive integers");
//         }
//         // Multiply each number by a unique prime raised to its index
//         return num * Math.pow(primes[index], num);
//       })
//       .reduce((a, b) => a ^ b, 0) // XOR for additional mixing
//       .toString(16); // Convert to hex for compact representation
//   }
//
//   // Examples
//   console.log(hashIntegers([1, 1, 2, 2, 1, 1])); // Different from hashIntegers([3, 2, 1])
//   console.log(hashIntegers([3, 2, 1, 4, 1, 2237])); // Different from hashIntegers([3, 2, 1])
// }

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
  todos.set((todos) => todos.slice(1));
  console.log("y", isEven.get());

  // x();
  countSub();
  todosSub();
  isEvenSub();

  log("done");
}

/* eslint-enable no-restricted-syntax */

/**
 * Base class that implements an immutable cache.
 *
 * TODO: Document usage.
 */
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

  get didInvalidate(): Observable<void> {
    return this._ev.observable;
  }

  /** @internal */
  protected abstract _toImmutable(): Readonly<T>;

  protected invalidate(): void {
    if (this._cache !== null) {
      this._cache = null;
      this._ev.notify();
    }
  }

  get current(): Readonly<T> {
    return this._cache ?? (this._cache = this._toImmutable());
  }
}
