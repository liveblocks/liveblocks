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
interface LazyValue<T> {
  readonly name: string;
  readonly value: T;
}

interface ReadonlySignal<T> {
  name: string;
  numSubscribers: number;
  readonly value: T;
  subscribe(callback: (value: LazyValue<T>) => void): () => void;
}

let signalId = 1;

export class Signal<T> implements ReadonlySignal<T> {
  public name: string = `Signal${signalId++}`;

  #fingerprint: number = 0;
  #equals: (a: T, b: T) => boolean;
  #value: T;
  #event: EventSource<this>;

  constructor(value: T, equals?: (a: T, b: T) => boolean) {
    this.#equals = equals ?? Object.is;
    this.#value = value;
    this.#event = makeEventSource<this>();
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

  get numSubscribers(): number {
    return this.#event.count();
  }

  get fingerprint(): number {
    return this.#fingerprint;
  }

  get value(): T {
    return this.#value;
  }

  set value(value: T) {
    if (!this.#equals(this.#value, value)) {
      this.#value = value;
      this.#fingerprint++;
      this.#event.notify(this);
    }
  }

  subscribe(callback: (value: LazyValue<T>) => void): () => void {
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
  #event: EventSource<this>;

  #parents: readonly ReadonlySignal<unknown>[];
  #transform: (...values: unknown[]) => T;
  #unlink?: () => void;

  private constructor(
    parents: ReadonlySignal<unknown>[],
    transform: (...values: unknown[]) => T,
    equals?: (a: T, b: T) => boolean
  ) {
    this.#equals = equals ?? Object.is;
    this.#dirty = true;
    this.#value = PLACEHOLDER as unknown as T;
    this.#event = makeEventSource<this>();
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
    this.#unlink?.();
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

  get numSubscribers(): number {
    return this.#event.count();
  }

  #recompute(): void {
    const derived = this.#transform(...this.#parents.map((p) => p.value));

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
    this.#dirty = this.#unlink === undefined;

    // Only emit a change to watchers if the value actually changed
    if (!this.#equals(this.#value, derived)) {
      this.#value = derived;
      this.#event.notify(this);
    }
  }

  get value(): T {
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
        parent.subscribe((p) => {
          globalThis.console.info(
            `🔄 [inside '${this.name}'] Parent signal '${p.name}' changed!`
          );
          this.#dirty = true;
        }),
      ] as const;
    });

    this.#unlink = () => {
      this.#unlink = undefined;

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

  subscribe(callback: (value: LazyValue<T>) => void): UnsubscribeCallback {
    const hadSubscribers = this.#event.count() > 0;

    const unsub = this.#event.subscribe(callback);

    // If this is the first subscriber, link the Signal up to the parent!
    if (!hadSubscribers) {
      this.#hookup();
    }

    return () => {
      unsub();

      // If this was the last subscriber unlinking, also unlink this
      // signal from its parent, so it can be garbage collected.
      if (this.#event.count() === 0) {
        this.#unlink?.();
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
  const isEven = DerivedSignal.from(count, (n) => {
    const rv = n % 2 === 0;
    log(`isEven RECOMPUTED based off of ${n} to be:`, rv);
    return rv;
  });
  isEven.name = "isEven";

  const todosSub = todos.subscribe((x) =>
    log(`List changed: ${x.value.join(", ")}`)
  );
  const countSub = count.subscribe((n) => log(`Count changed: ${n.value}`));
  const isEvenSub = isEven.subscribe((b) => log(`isEven changed: ${b.value}`));

  log({
    todos: todos.value,
    multiplier: multiplier.value,
    count: count.value,
    isEven: isEven.value,
    isEven2: isEven.value,
    isEven3: isEven.value,
    isEven4: isEven.value,
    isEven5: isEven.value,
    isEven6: isEven.value,
  });

  // todos.value = [...todos.value, "Do laundry"];
  // multiplier.value = 1;
  // todos.value = todos.value.splice(1);
  // multiplier.value = 2;

  log({
    todos: todos.value,
    multiplier: multiplier.value,
    count: count.value,
    isEven: isEven.value,
    isEven2: isEven.value,
    isEven3: isEven.value,
    isEven4: isEven.value,
    isEven5: isEven.value,
    isEven6: isEven.value,
  });

  multiplier.value = 3;

  log({
    todos: todos.value,
    multiplier: multiplier.value,
    count: count.value,
    isEven: isEven.value,
    isEven2: isEven.value,
  });

  console.log("x", isEven.value);
  todos.value = todos.value.slice(1);
  console.log("y", isEven.value);

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
