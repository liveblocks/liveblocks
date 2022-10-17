/**
 * This helper type is effectively a no-op, but will force TypeScript to
 * "evaluate" any named helper types in its definition. This can sometimes make
 * API signatures clearer in IDEs.
 *
 * For example, in:
 *
 *   type Payload<T> = { data: T };
 *
 *   let r1: Payload<string>;
 *   let r2: Resolve<Payload<string>>;
 *
 * The inferred type of `r1` is going to be `Payload<string>` which shows up in
 * editor hints, and it may be unclear what's inside if you don't know the
 * definition of `Payload`.
 *
 * The inferred type of `r2` is going to be `{ data: string }`, which may be
 * more helpful.
 *
 * This trick comes from:
 * https://effectivetypescript.com/2022/02/25/gentips-4-display/
 */
export type Resolve<T> = T extends (...args: unknown[]) => unknown
  ? T
  : { [K in keyof T]: T[K] };
