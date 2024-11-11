declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

export type OpId = Brand<string, "OpId">;

export type OmitFirstArg<F> = F extends (
  first: any,
  ...args: infer A
) => infer R
  ? (...args: A) => R
  : never;

export type ChangeReturnType<F, T> = F extends (...args: infer A) => any
  ? (...args: A) => T
  : never;
