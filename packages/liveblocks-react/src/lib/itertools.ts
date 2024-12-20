/**
 * Like Array.prototype.find(), but for iterables.
 *
 * Returns the first item in the iterable for which the predicate holds.
 * Returns undefined if item matches the predicate.
 */
export function find<T>(
  it: Iterable<T>,
  predicate: (value: T) => boolean
): T | undefined {
  for (const item of it) {
    if (predicate(item)) return item;
  }
  return undefined;
}
