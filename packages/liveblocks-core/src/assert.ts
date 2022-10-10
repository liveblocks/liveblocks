/**
 * Helper function that can be used to implement exhaustive switch statements
 * with TypeScript. Example usage:
 *
 *    type Fruit = "🍎" | "🍌";
 *
 *    switch (fruit) {
 *      case "🍎":
 *      case "🍌":
 *        return doSomething();
 *
 *      default:
 *        return assertNever(fruit, "Unknown fruit");
 *    }
 *
 * If now the Fruit union is extended (i.e. add "🍒"), TypeScript will catch
 * this *statically*, rather than at runtime, and force you to handle the
 * 🍒 case.
 */
export function assertNever(_value: never, errmsg: string): never {
  throw new Error(errmsg);
}

/**
 * Asserts that a certain condition holds. If it does not hold, will throw
 * a runtime error in dev mode.
 *
 * In production, nothing is asserted and this acts as a no-op.
 */
export function assert(condition: boolean, errmsg: string): asserts condition {
  if (process.env.NODE_ENV !== "production" && !condition) {
    const err = new Error(errmsg);
    err.name = "Assertion failure";
    throw err;
  }
}

/**
 * Asserts that a given value is non-nullable. This is similar to TypeScript's
 * `!` operator, but will throw an error at runtime (dev-mode only) indicating
 * an incorrect assumption.
 *
 * Instead of:
 *
 *     foo!.bar
 *
 * Use:
 *
 *     nn(foo).bar
 *
 */
export function nn<T>(
  value: T,
  errmsg: string = "Expected value to be non-nullable"
): NonNullable<T> {
  assert(value !== null && value !== undefined, errmsg);
  return value as NonNullable<T>;
}
