export function raise(message: string): never {
  throw new Error(message);
}

export function mapv<T, U>(
  obj: Record<string, T>,
  mapper: (value: T, key: string) => U
): Record<string, U> {
  const rv: Record<string, U> = {};
  for (const key of Object.keys(obj)) {
    rv[key] = mapper(obj[key], key);
  }
  return rv;
}
