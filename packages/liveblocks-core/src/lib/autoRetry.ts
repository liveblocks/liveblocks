import * as console from "./fancy-console";
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
 * @param throwError An optional function to not auto-retry on certain errors
 */
export async function autoRetry<T>(
  promiseFn: () => Promise<T>,
  maxTries: number,
  backoff: number[],
  throwError?: (err: any) => boolean
): Promise<T> {
  const fallbackBackoff = backoff.length > 0 ? backoff[backoff.length - 1] : 0;

  let attempt = 0;

  while (true) {
    attempt++;

    const promise = promiseFn();
    try {
      return await promise;
    } catch (err) {
      // TODO: Think more about this abstraction
      if (throwError?.(err) || err instanceof StopRetrying) {
        throw err;
      }

      if (attempt >= maxTries) {
        // Fail the entire promise right now
        throw new Error(`Failed after ${maxTries} attempts: ${String(err)}`);
      }
    }

    // Do another retry
    const delay = backoff[attempt - 1] ?? fallbackBackoff;

    console.warn(
      `Attempt ${attempt} was unsuccessful. Retrying in ${delay} milliseconds.`
    );
    await wait(delay);
  }
}

// XXX Either DRY this up with the equivalent class in @liveblocks/core, or
// find a better solution for this!
export class StopRetrying extends Error {
  constructor(reason: string) {
    super(reason);
  }
}
