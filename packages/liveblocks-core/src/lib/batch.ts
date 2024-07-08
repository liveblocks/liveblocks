import { makeEventSource } from "./EventSource";
import type { Observable } from "./EventSource";
import { stringify } from "./stringify";

const DEFAULT_SIZE = 50;
const DEFAULT_DELAY = 100;

type Resolve<T> = (value: T | Promise<T>) => void;

type Reject = (reason?: unknown) => void;

export type BatchCallback<T, A extends unknown[]> = (
  args: A[]
) => (T | Error)[] | Promise<(T | Error)[]>;

export type BatchStoreStateLoading = {
  isLoading: true;
  data?: never;
  error?: never;
};

export type BatchStoreStateError = {
  isLoading: false;
  data?: never;
  error: Error;
};

export type BatchStoreStateSuccess<T> = {
  isLoading: false;
  data: T;
  error?: never;
};

export type BatchStoreState<T> =
  | BatchStoreStateLoading
  | BatchStoreStateError
  | BatchStoreStateSuccess<T>;

export type BatchStore<T, A extends unknown[]> = Observable<void> & {
  get: (...args: A) => Promise<void>;
  getState: (...args: A) => BatchStoreState<T> | undefined;
};

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

class BatchCall<T, A extends unknown[]> {
  readonly args: A;
  resolve: Resolve<T> = noop;
  reject: Reject = noop;
  promise: Promise<T> = new Promise(noop);

  constructor(args: A) {
    this.args = args;
  }
}

/**
 * Batch calls to a function, either by number of calls or by a maximum delay.
 */
export class Batch<T, A extends unknown[] = []> {
  private queue: BatchCall<T, A>[] = [];
  private callback: BatchCallback<T, A>;
  private size: number;
  private delay: number;
  private delayTimeoutId?: ReturnType<typeof setTimeout>;
  public error = false;

  constructor(callback: BatchCallback<T, A>, options?: Options) {
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

        if (!Array.isArray(results)) {
          call.reject(new Error("Callback must return an array."));
        } else if (calls.length !== results.length) {
          call.reject(
            new Error(
              `Callback must return an array of the same length as the number of provided items. Expected ${calls.length}, but got ${results.length}.`
            )
          );
        } else if (result instanceof Error) {
          call.reject(result);
        } else {
          call.resolve(result);
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

  get(...args: A): Promise<T> {
    // Check if there's already an identical call in the queue.
    const existingCall = this.queue.find(
      (call) => stringify(call.args) === stringify(args)
    );

    // If an existing call exists, return its promise.
    if (existingCall) {
      return existingCall.promise;
    }

    // If no existing call exists, add the call to the queue and schedule a flush.
    const call = new BatchCall<T, A>(args);
    call.promise = new Promise<T>((resolve, reject) => {
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
 * Create a store based on a batch callback.
 * Each call will be cached and get its own state in addition to being batched.
 */
export function createBatchStore<T, A extends unknown[]>(
  callback: BatchCallback<T, A>,
  options?: Options
): BatchStore<T, A> {
  const batch = new Batch(callback, options);
  const cache = new Map<string, BatchStoreState<T>>();
  const eventSource = makeEventSource<void>();

  function getCacheKey(args: A): string {
    return stringify(args);
  }

  function setStateAndNotify(cacheKey: string, state: BatchStoreState<T>) {
    // Set or delete the state.
    cache.set(cacheKey, state);

    // Notify subscribers.
    eventSource.notify();
  }

  async function get(...args: A) {
    const cacheKey = getCacheKey(args);

    // If this call already has a state, return early.
    if (cache.has(cacheKey)) {
      return;
    }

    try {
      // Set the state to loading.
      setStateAndNotify(cacheKey, { isLoading: true });

      // Wait for the batch to process this call.
      const result = await batch.get(...args);

      // Set the state to the result.
      setStateAndNotify(cacheKey, { isLoading: false, data: result });
    } catch (error) {
      // // TODO: Differentiate whole batch errors from individual errors.
      // if (batch.error) {
      //   // If the whole batch errored, clear the state.
      //   // TODO: Keep track of retries and only clear the state a few times because it will be retried each time.
      //   //       Also implement exponential backoff to delay retries to avoid hammering `resolveUsers`.
      //   setStateAndNotify(cacheKey, undefined);
      // } else {
      //   // Otherwise, keep individual errors to avoid repeatedly loading the same error.
      //   setStateAndNotify(cacheKey, {
      //     isLoading: false,
      //     error: error as Error,
      //   });
      // }

      // If there was an error (for various reasons), set the state to the error.
      setStateAndNotify(cacheKey, {
        isLoading: false,
        error: error as Error,
      });
    }
  }

  function getState(...args: A) {
    const cacheKey = getCacheKey(args);

    return cache.get(cacheKey);
  }

  return {
    ...eventSource.observable,
    get,
    getState,
  };
}
