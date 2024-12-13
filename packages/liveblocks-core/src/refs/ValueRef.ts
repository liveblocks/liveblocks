import { ImmutableRef } from "./ImmutableRef";

export class DerivedRef<
  T,
  Is extends readonly [ImmutableRef<unknown>, ...ImmutableRef<unknown>[]],
  Vs extends readonly [unknown, ...unknown[]] = {
    [K in keyof Is]: Is[K] extends ImmutableRef<unknown>
      ? ReturnType<Is[K]["get"]>
      : never;
  },
> extends ImmutableRef<T> {
  /** @internal */
  private _refs: Is;
  private _transform: (...values: Vs) => T;

  constructor(...args: [...otherRefs: Is, transformFn: (...values: Vs) => T]) {
    super();

    const transformFn = args.pop() as (...values: Vs) => T;
    const otherRefs = args as unknown as Is;

    this._refs = otherRefs;
    this._refs.forEach((ref) => {
      // TODO: We should also _unsubscribe_ these at some point... how? Require an explicit .destroy() call?
      ref.subscribe(() => this.notify());
    });

    this._transform = transformFn;
  }

  /** @internal */
  _toImmutable(): Readonly<T> {
    return this._transform(
      ...(this._refs.map((ref) => ref.get()) as unknown as Vs)
    );
  }
}
