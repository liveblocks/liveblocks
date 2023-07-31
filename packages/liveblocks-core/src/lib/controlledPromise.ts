/**
 * Returns a pair of a Promise, and a flagger function that can be passed
 * around to resolve the promise "from anywhere".
 *
 * The Promise will remain unresolved, until the flagger function is called.
 * Once the flagger function is called with a value, the Promise will resolve
 * to that value.
 *
 * Calling the flagger function beyond the first time is a no-op.
 */
export function controlledPromise<T>(): [
  promise: Promise<T>,
  flagger: (value: T) => void,
] {
  let flagger: ((value: T) => void) | undefined;
  const promise = new Promise<T>((res) => {
    flagger = res;
  });
  if (!flagger) {
    throw new Error("Should never happen");
  }
  return [promise, flagger];
}
