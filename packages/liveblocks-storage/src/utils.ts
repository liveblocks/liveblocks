export function raise(message: string): never {
  throw new Error(message);
}

let nextId = "A";

export function nextAlphabetId(): string {
  const curr = nextId;
  if (nextId.endsWith("Z")) {
    nextId = "A".repeat(nextId.length + 1);
  } else {
    nextId =
      nextId.slice(0, -1) +
      String.fromCharCode(nextId[nextId.length - 1]!.charCodeAt(0) + 1);
  }
  return curr;
}

// Inlined version of 3.3.7 of nanoid.js
// https://www.npmjs.com/package/nanoid/v/3.3.7?activeTab=code
export const nanoid = (t = 21): string =>
  crypto
    .getRandomValues(new Uint8Array(t))
    .reduce(
      (t, e) =>
        (t +=
          (e &= 63) < 36
            ? e.toString(36)
            : e < 62
              ? (e - 26).toString(36).toUpperCase()
              : e < 63
                ? "_"
                : "-"),
      ""
    );

/**
 * Creates a new object by mapping a function over all values. Keys remain the
 * same. Think Array.prototype.map(), but for values in an object.
 */
export function mapValues<V, O extends Record<string, unknown>>(
  obj: O,
  mapFn: (value: O[keyof O], key: keyof O) => V
): { [K in keyof O]: V } {
  const result = {} as { [K in keyof O]: V };
  for (const pair of Object.entries(obj)) {
    const key: keyof O = pair[0];
    if (key === "__proto__") {
      // Avoid setting dangerous __proto__ keys
      continue;
    }
    const value = pair[1] as O[keyof O];
    result[key] = mapFn(value, key);
  }
  return result;
}
