export function get<T, TKey extends keyof T>(
  value: T,
  key: TKey
): T[TKey] | undefined {
  return Object.prototype.hasOwnProperty.call(value, key)
    ? value[key]
    : undefined;
}
