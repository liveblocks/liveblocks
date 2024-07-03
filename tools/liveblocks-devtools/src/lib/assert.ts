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
