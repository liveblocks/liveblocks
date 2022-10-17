import { freeze } from "../lib/freeze";
import { compactObject } from "../lib/utils";
import { ImmutableRef } from "./ImmutableRef";

export class ValueRef<T> extends ImmutableRef<T> {
  /** @internal */
  private _value: Readonly<T>;

  constructor(initialValue: T) {
    super();
    this._value = freeze(compactObject(initialValue));
  }

  /** @internal */
  _toImmutable(): Readonly<T> {
    return this._value;
  }

  set(newValue: T): void {
    this._value = freeze(newValue);
    this.invalidate();
  }
}

// TODO: Generalize to arbitrary number of "input refs"
export class DerivedRef<T, V1, V2> extends ImmutableRef<T> {
  /** @internal */
  private _refs: readonly [ImmutableRef<V1>, ImmutableRef<V2>];
  private _transform: (v1: V1, v2: V2) => T;

  constructor(
    otherRefs: readonly [ImmutableRef<V1>, ImmutableRef<V2>],
    transformFn: (...args: [V1, V2]) => T
  ) {
    super();

    this._refs = otherRefs;
    this._refs.forEach((ref) => {
      // TODO: We should also _unsubscribe_ these at some point... how? Require an explicit .destroy() call?
      ref.didInvalidate.subscribe(() => this.invalidate());
    });

    this._transform = transformFn;
  }

  /** @internal */
  _toImmutable(): Readonly<T> {
    return this._transform(this._refs[0].current, this._refs[1].current);
  }
}
