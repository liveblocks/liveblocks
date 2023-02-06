/**
 * Returns an iterator object for the given iterable.  This can be used to
 * manually get an iterator for any iterable datastructure.  The purpose and
 * main use case of this function is to get a single iterator (a thing with
 * state, think of it as a "cursor") which can only be consumed once.
 */
function iter<T>(iterable: Iterable<T>): Iterator<T> {
  return iterable[Symbol.iterator]();
}

/**
 * Returns an iterable of enumeration pairs.  Iterable must be a sequence, an
 * iterator, or some other object which supports iteration.  The elements
 * produced by returns a tuple containing a counter value (starting from 0 by
 * default) and the values obtained from iterating over given iterable.
 *
 * Example:
 *
 *     import { enumerate } from 'itertools';
 *
 *     console.log([...enumerate(['hello', 'world'])]);
 *     // [0, 'hello'], [1, 'world']]
 */
export function* enumerate<T>(
  iterable: Iterable<T>,
  start: number = 0
): Iterable<[number, T]> {
  let index: number = start;
  for (const value of iterable) {
    yield [index++, value];
  }
}

/**
 * Returns an iterator that aggregates elements from each of the iterables.
 * Used for lock-step iteration over several iterables at a time.  When
 * iterating over two iterables, use `izip2`.  When iterating over three
 * iterables, use `izip3`, etc.  `izip` is an alias for `izip2`.
 */
export function* zip<T1, T2>(
  xs: Iterable<T1>,
  ys: Iterable<T2>
): Iterable<[T1, T2]> {
  const ixs = iter(xs);
  const iys = iter(ys);
  for (;;) {
    const x = ixs.next();
    const y = iys.next();
    if (!x.done && !y.done) {
      yield [x.value, y.value];
    } else {
      // One of the iterables exhausted
      return;
    }
  }
}
