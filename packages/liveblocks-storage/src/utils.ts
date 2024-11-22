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

export function* chain<T>(
  ...iterables: (Iterable<T> | undefined)[]
): IterableIterator<T> {
  for (const iterable of iterables) {
    if (iterable) {
      yield* iterable;
    }
  }
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
