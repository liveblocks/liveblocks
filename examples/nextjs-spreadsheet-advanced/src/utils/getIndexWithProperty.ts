export function getIndexWithProperty<T extends {}, K extends keyof T>(
  array: T[],
  property: K,
  value: T[K]
) {
  return array.findIndex((element) => element[property] === value);
}
