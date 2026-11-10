/** Abort this wait without cancelling work that other callers may still need. */
export function withAbortSignal<T>(
  promise$: Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (signal === undefined) return promise$;

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
    promise$.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}
