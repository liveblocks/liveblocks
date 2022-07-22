export function appendUnit(value: number | string, unit: string = "px") {
  return `${value}${unit}`;
}

export function getIndexWithId<T extends { id: string | number }>(
  array: T[],
  id: string | number
) {
  return array.findIndex((element) => element.id === id);
}
