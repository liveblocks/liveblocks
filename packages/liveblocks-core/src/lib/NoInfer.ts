/**
 * Back-port of TypeScript 5.4's built-in NoInfer utility type.
 * See https://stackoverflow.com/a/56688073/148872
 */
export type NoInfr<A> = [A][A extends any ? 0 : never];
//          ^^^^^^ Not a typo, the name `NoInfer` is reserved in TS 5.4+
