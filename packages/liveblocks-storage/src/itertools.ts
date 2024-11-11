export function* chain<T>(
  ...iterables: (Iterable<T> | undefined)[]
): IterableIterator<T> {
  for (const iterable of iterables) {
    if (iterable) {
      yield* iterable;
    }
  }
}
