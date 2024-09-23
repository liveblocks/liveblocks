import { wait } from "./utils";

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
  backoff: number[],
  exitCondition?: (error: any) => boolean
): Promise<T> {
  const fallbackBackoff = backoff.length > 0 ? backoff[backoff.length - 1] : 0;

  let attempt = 0;

  while (true) {
    attempt++;

    const promise = promiseFn();
    try {
      return await promise;
    } catch (err) {
      if (exitCondition && exitCondition(err)) {
        throw err;
      }

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
