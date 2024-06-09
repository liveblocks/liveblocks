/**
 * Back-port of TypeScript 5.4's built-in NoInfer utility type. We cannot use
 * the name `NoInfer` here, because in TS 5.4, it's a reserved type name.
 * See https://stackoverflow.com/a/56688073/148872
 */
export type NoInfr<A extends any> = [A][A extends any ? 0 : never];
//          ^^^^^^ Not a typo
