// Wrap function to be called only once, subsequent calls will return the
// the cached result of the first call.
export function once<T>(fn: () => T): () => T {
  let called = false;
  let result: T;

  return () => {
    if (called) {
      return result;
    }

    called = true;
    result = fn();
    return result;
  };
}
