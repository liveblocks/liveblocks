export type CompareFn<T> = (a: T, b: T) => number;

/**
 * Given a comparison function (for use in .sort()), generates one that will
 * result in the inversed sort order.
 */
export function reverseCmp<T>(cmpFn: CompareFn<T>): CompareFn<T> {
  return (a: T, b: T) => 0 - cmpFn(a, b);
}
