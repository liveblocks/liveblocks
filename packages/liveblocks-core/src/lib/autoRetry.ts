import * as console from "./fancy-console";
import { isPlainObject } from "./guards";
import type { JsonObject } from "./Json";
import { tryParseJson, wait } from "./utils";

export class HttpError extends Error {
  public response: Response;
  public details?: JsonObject;

  private constructor(
    message: string,
    response: Response,
    details?: JsonObject
  ) {
    super(message);
    this.name = "HttpError";
    this.response = response;
    this.details = details;
  }

  static async fromResponse(response: Response): Promise<HttpError> {
    // Try to extract `message` and `details` from the response, and
    // construct the HttpError instance
    let bodyAsText: string | undefined;
    try {
      bodyAsText = await response.text();
    } catch {
      // Ignore
    }

    const bodyAsJson = bodyAsText ? tryParseJson(bodyAsText) : undefined;

    let bodyAsJsonObject: JsonObject | undefined;
    if (isPlainObject(bodyAsJson)) {
      bodyAsJsonObject = bodyAsJson;
    }

    let message = "";
    message ||=
      typeof bodyAsJsonObject?.message === "string"
        ? bodyAsJsonObject.message
        : "";
    message ||=
      typeof bodyAsJsonObject?.error === "string" ? bodyAsJsonObject.error : "";
    if (bodyAsJson === undefined) {
      message ||= bodyAsText || "";
    }
    message ||= response.statusText;

    let path: string | undefined;
    try {
      path = new URL(response.url).pathname;
    } catch {
      // Ignore
    }
    message +=
      path !== undefined
        ? ` (got status ${response.status} from ${path})`
        : ` (got status ${response.status})`;

    const details = bodyAsJsonObject;
    return new HttpError(message, response, details);
  }

  /**
   * Convenience accessor for response.status.
   */
  get status(): number {
    return this.response.status;
  }
}

const DONT_RETRY_4XX = (x: unknown) =>
  x instanceof HttpError && x.status >= 400 && x.status < 500;

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
 * @param shouldStopRetrying An optional function to not auto-retry on certain errors
 */
export async function autoRetry<T>(
  promiseFn: () => Promise<T>,
  maxTries: number,
  backoff: number[],
  shouldStopRetrying: (err: any) => boolean = DONT_RETRY_4XX
): Promise<T> {
  const fallbackBackoff = backoff.length > 0 ? backoff[backoff.length - 1] : 0;

  let attempt = 0;

  while (true) {
    attempt++;

    try {
      return await promiseFn();
    } catch (err) {
      if (shouldStopRetrying(err)) {
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
