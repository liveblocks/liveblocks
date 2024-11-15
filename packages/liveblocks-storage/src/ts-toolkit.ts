declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

export type OmitFirstArg<F> = F extends (
  first: unknown,
  ...args: infer A
) => infer R
  ? (...args: A) => R
  : never;

export type ChangeReturnType<F, T> = F extends (...args: infer A) => unknown
  ? (...args: A) => T
  : never;
