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
