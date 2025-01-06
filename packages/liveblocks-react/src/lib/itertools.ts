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

/**
 * Counts the number of items in an iterable that match the predicate.
 */
export function count<T>(
  it: Iterable<T>,
  predicate: (value: T) => boolean
): number {
  let total = 0;
  for (const item of it) {
    if (predicate(item)) total++;
  }
  return total;
}
