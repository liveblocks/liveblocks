export function findLastIndex<T>(
  array: T[],
  predicate: (member: T) => unknown
) {
  let index = array.length - 1;

  while (index >= 0) {
    const element = array[index];

    if (element && predicate(element)) {
      return index;
    }

    index--;
  }

  return -1;
}
