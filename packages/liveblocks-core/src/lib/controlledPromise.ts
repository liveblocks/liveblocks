/**
 * Returns a pair of a Promise, and a resolve function that can be passed
 * around to resolve the promise "from anywhere".
 *
 * The Promise will remain unresolved, until the resolve function is called.
 * Once the resolve function is called with a value, the Promise will resolve
 * to that value.
 *
 * Calling the resolve function beyond the first time is a no-op.
 */
export function controlledPromise<T>(): [
  promise: Promise<T>,
  resolve: (value: T) => void,
  reject: (reason: unknown) => void,
] {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((reason: unknown) => void) | undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // eslint-disable-next-line no-restricted-syntax
  return [promise, resolve!, reject!];
}

/**
 * Drop-in replacement for the ES2024 Promise.withResolvers() API.
 */
export function Promise_withResolvers<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  const [promise, resolve, reject] = controlledPromise<T>();
  return { promise, resolve, reject };
}
