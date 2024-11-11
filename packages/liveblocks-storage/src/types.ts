export type OmitFirstArg<F> = F extends (
  first: any,
  ...args: infer A
) => infer R
  ? (...args: A) => R
  : never;
