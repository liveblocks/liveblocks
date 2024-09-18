import { wait } from "@liveblocks/core";

const MAX_ERROR_RETRY_COUNT = 5;

const ERROR_RETRY_INTERVAL = 5000; // 5 seconds

/**
 * Retries an action using the exponential backoff algorithm
 * @param action The action to retry
 * @param retryCount The number of times the action has been retried
 */
export function retryError(action: () => void, retryCount: number) {
  if (retryCount >= MAX_ERROR_RETRY_COUNT) return;

  const timeout = Math.pow(2, retryCount) * ERROR_RETRY_INTERVAL;

  setTimeout(() => {
    void action();
  }, timeout);
}

/**
 * Wraps a promise factory. Will create promises until one succeeds. If
 * a promise rejects, it will retry calling the factory for at most `maxTries`
 * times. Between each attempt, it will inject a a backoff delay (in millis)
 * from the given array. If the array contains fewer items then `maxTries`,
 * then the last backoff number will be used indefinitely.
 *
 * If the last attempt is rejected too, the returned promise will fail too.
 *
 * @param promiseFn The promise factory to execute
 * @param maxTries The number of total tries (must be >=1)
 * @param backoff An array of timings to inject between each promise attempt
 */
export async function autoRetry<T>(
  promiseFn: () => Promise<T>,
  maxTries: number,
  backoff: number[]
): Promise<T> {
  const fallbackBackoff = backoff.length > 0 ? backoff[backoff.length - 1]! : 0;

  let attempt = 0;

  while (true) {
    attempt++;

    const promise = promiseFn();
    try {
      return await promise;
    } catch (err) {
      if (attempt >= maxTries) {
        // Fail the entire promise right now
        throw new Error(`Failed after ${maxTries} attempts: ${String(err)}`);
      }
    }

    // Do another retry
    const delay = backoff[attempt - 1] ?? fallbackBackoff;
    await wait(delay);
  }
}
