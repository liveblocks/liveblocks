export function findLastIndex<T>(
  array: T[],
  predicate: (member: T) => unknown
) {
  let index = array.length - 1;

  while (index >= 0) {
    if (predicate(array[index])) {
      return index;
    }

    index--;
  }

  return -1;
}
