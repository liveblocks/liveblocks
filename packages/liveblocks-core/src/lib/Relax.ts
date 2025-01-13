import type { Resolve } from "./Resolve";

/**
 * Relaxes a discriminated union type definition, by explicitly adding
 * properties defined in any other member as 'never'.
 *
 * This makes accessing the members much more relaxed in TypeScript.
 *
 * For example:
 *   type MyUnion = Relax<
 *     | { foo: string }
 *     | { foo: number; bar: string; }
 *     | { qux: boolean }
 *   >;
 *
 *   // With Relax, accessing is much easier:
 *   union.foo;       // string | number | undefined
 *   union.bar;       // string | undefined
 *   union.qux;       // boolean
 *   union.whatever;  // Error: Property 'whatever' does not exist on type 'MyUnion'
 *
 *   // Without Relax, these would all be type errors:
 *   union.foo; // Error: Property 'foo' does not exist on type 'MyUnion'
 *   union.bar; // Error: Property 'bar' does not exist on type 'MyUnion'
 *   union.qux; // Error: Property 'qux' does not exist on type 'MyUnion'
 */
export type Relax<T> = DistributiveRelax<T, T extends any ? keyof T : never>;
type DistributiveRelax<T, Ks extends string | number | symbol> = T extends any
  ? Resolve<{ [K in keyof T]: T[K] } & { [K in Exclude<Ks, keyof T>]?: never }>
  : never;
