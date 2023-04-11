export function invariant(
  condition: unknown,
  msg: string = "Assertion failed"
): asserts condition {
  if (!condition) {
    throw new Error(`Invariant failed: ${msg}`);
  }
}
