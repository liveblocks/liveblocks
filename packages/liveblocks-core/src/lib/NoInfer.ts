export type NoInferr<A extends any> = [A][A extends any ? 0 : never];
