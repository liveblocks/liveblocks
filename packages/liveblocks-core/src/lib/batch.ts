import { stringify } from "./stringify";

const DEFAULT_SIZE = 50;
const DEFAULT_DELAY = 100;

type Resolve<T> = (value: T | Promise<T>) => void;

type Reject = (reason?: unknown) => void;

type BatchCallback<Result, Args extends unknown[]> = (
  args: Args[]
) => (Result | Error)[] | Promise<(Result | Error)[]>;

interface Options {
  /**
   * How many calls to batch together at most.
   */
  size?: number;

  /**
   * How long to wait before flushing the batch.
   */
  delay?: number;
}

const noop = () => {};

class BatchCall<Result, Args extends unknown[]> {
  readonly args: Args;
  resolve: Resolve<Result> = noop;
  reject: Reject = noop;
  promise: Promise<Result> = new Promise(noop);

  constructor(args: Args) {
    this.args = args;
  }
}

/**
 * Batch calls to a function, either by number of calls or by a maximum delay.
 */
export class Batch<Result, Args extends unknown[] = []> {
  private queue: BatchCall<Result, Args>[] = [];
  private callback: BatchCallback<Result, Args>;
  private size: number;
  private delay: number;
  private delayTimeoutId?: ReturnType<typeof setTimeout>;
  public error = false;

  constructor(callback: BatchCallback<Result, Args>, options?: Options) {
    this.callback = callback;
    this.size = options?.size ?? DEFAULT_SIZE;
    this.delay = options?.delay ?? DEFAULT_DELAY;
  }

  private clearDelayTimeout(): void {
    if (this.delayTimeoutId !== undefined) {
      clearTimeout(this.delayTimeoutId);
      this.delayTimeoutId = undefined;
    }
  }

  private schedule() {
    if (this.queue.length === this.size) {
      // If the queue is full, flush it immediately.
      void this.flush();
    } else if (this.queue.length === 1) {
      // If the call is the first in the queue, schedule a flush.
      this.clearDelayTimeout();
      this.delayTimeoutId = setTimeout(() => void this.flush(), this.delay);
    }
  }

  private async flush(): Promise<void> {
    // If the queue is empty, don't call the callback.
    if (this.queue.length === 0) {
      return;
    }

    // Empty the queue and get its calls.
    const calls = this.queue.splice(0);
    const args = calls.map((call) => call.args);

    try {
      // Call the batch callback with the queued arguments.
      const results = await this.callback(args);
      this.error = false;

      // Resolve or reject each call.
      calls.forEach((call, index) => {
        const result = results?.[index];

        if (result instanceof Error) {
          call.reject(result);
        } else if (result !== undefined) {
          call.resolve(result);
        } else {
          if (Array.isArray(results)) {
            call.reject(
              new Error(
                `Batch callback must return an array of the same length as the number of calls in the batch. Expected ${calls.length}, but got ${results.length}.`
              )
            );
          } else {
            call.reject(new Error("Batch callback must return an array."));
          }
        }
      });
    } catch (error) {
      this.error = true;

      // Reject all calls if the whole batch errored or was rejected.
      calls.forEach((call) => {
        call.reject(error);
      });
    }
  }

  add(...args: Args): Promise<Result> {
    // Check if there's already an identical call in the queue.
    const existingCall = this.queue.find(
      (call) => stringify(call.args) === stringify(args)
    );

    // If an existing call exists, return its promise.
    if (existingCall) {
      return existingCall.promise;
    }

    // If no existing call exists, add the call to the queue and schedule a flush.
    const call = new BatchCall<Result, Args>(args);
    call.promise = new Promise<Result>((resolve, reject) => {
      call.resolve = resolve;
      call.reject = reject;
    });
    this.queue.push(call);
    this.schedule();

    return call.promise;
  }

  clear(): void {
    this.queue = [];
    this.error = false;
    this.clearDelayTimeout();
  }
}

/**
 * Batch calls to a function, either by number of calls or by a maximum delay, and cache the results.
 */
export class BatchCache<Result, Args extends unknown[] = []> {
  private batch: Batch<Result, Args>;
  private cache: Map<string, Result | Error> = new Map();

  constructor(callback: BatchCallback<Result, Args>, options?: Options) {
    this.batch = new Batch(callback, options);
  }

  private getCacheKey(args: Args): string {
    return stringify(args);
  }

  async add(...args: Args): Promise<Result> {
    const cacheKey = this.getCacheKey(args);

    // If already cached, return the result.
    if (this.cache.has(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey);

      // Unless it was an error, in that case rethrow it.
      if (cachedResult instanceof Error) {
        throw cachedResult;
      }

      return cachedResult as Result;
    }

    try {
      // If not cached, add to the current batch.
      const result = await this.batch.add(...args);

      // Cache the result.
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      // If the whole batch errored, rethrow the error.
      if (this.batch.error) {
        throw error;
      }

      // Cache individual errors to avoid repeatedly loading the same error.
      this.cache.set(cacheKey, error as Error);

      throw error;
    }
  }

  remove(...args: Args): void {
    const cacheKey = this.getCacheKey(args);
    this.cache.delete(cacheKey);
  }

  clear(): void {
    this.batch.clear();
    this.cache.clear();
  }
}
