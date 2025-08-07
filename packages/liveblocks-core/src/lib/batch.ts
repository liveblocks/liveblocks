import type { AsyncResult } from "./AsyncResult";
import { Promise_withResolvers } from "./controlledPromise";
import type { Callback, UnsubscribeCallback } from "./EventSource";
import { MutableSignal } from "./signals";
import { stableStringify } from "./stringify";

const DEFAULT_SIZE = 50;

type Resolve<T> = (value: T) => void;
type Reject = (reason?: unknown) => void;

export type BatchCallback<O, I> = (
  inputs: I[]
) => (O | Error)[] | Promise<(O | Error)[]>;

export type BatchStore<O, I> = {
  subscribe: (callback: Callback<void>) => UnsubscribeCallback;
  enqueue: (input: I) => Promise<void>;
  fill: (input: I, data: O) => void;
  getItemState: (input: I) => AsyncResult<O> | undefined;
  getData: (input: I) => O | undefined;
  invalidate: (inputs?: I[]) => void;

  /**
   * @internal
   */
  readonly batch: Batch<O, I>;

  /**
   * @internal
   *
   * Only for testing.
   */
  _cacheKeys: () => string[];
};

interface BatchOptions {
  /**
   * How many calls to batch together at most.
   */
  size?: number;

  /**
   * How long to wait before flushing the batch.
   */
  delay: number;
}

class BatchCall<O, I> {
  readonly input: I;
  readonly resolve: Resolve<O>;
  readonly reject: Reject;
  readonly promise: Promise<O>;

  constructor(input: I) {
    this.input = input;

    const { promise, resolve, reject } = Promise_withResolvers<O>();
    this.promise = promise;
    this.resolve = resolve;
    this.reject = reject;
  }
}

/**
 * Batch calls to a function, either by number of calls or by a maximum delay.
 */
export class Batch<O, I> {
  #queue: BatchCall<O, I>[] = [];
  #callback: BatchCallback<O, I>;
  #size: number;
  #delay: number;
  #delayTimeoutId?: ReturnType<typeof setTimeout>;
  public error = false;

  constructor(callback: BatchCallback<O, I>, options: BatchOptions) {
    this.#callback = callback;
    this.#size = options.size ?? DEFAULT_SIZE;
    this.#delay = options.delay;
  }

  #clearDelayTimeout(): void {
    if (this.#delayTimeoutId !== undefined) {
      clearTimeout(this.#delayTimeoutId);
      this.#delayTimeoutId = undefined;
    }
  }

  #schedule() {
    if (this.#queue.length === this.#size) {
      // If the queue is full, flush it immediately.
      void this.#flush();
    } else if (this.#queue.length === 1) {
      // If the call is the first in the queue, schedule a flush.
      this.#clearDelayTimeout();
      this.#delayTimeoutId = setTimeout(() => void this.#flush(), this.#delay);
    }
  }

  async #flush(): Promise<void> {
    // If the queue is empty, don't call the callback.
    if (this.#queue.length === 0) {
      return;
    }

    // Empty the queue and get its calls.
    const calls = this.#queue.splice(0);
    const inputs = calls.map((call) => call.input);

    try {
      // Call the batch callback with the queued arguments.
      const results = await this.#callback(inputs);
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

  get(input: I): Promise<O> {
    // Check if there's already an identical call in the queue.
    const existingCall = this.#queue.find(
      (call) => stableStringify(call.input) === stableStringify(input)
    );

    // If an existing call exists, return its promise.
    if (existingCall) {
      return existingCall.promise;
    }

    // If no existing call exists, add the call to the queue and schedule a flush.
    const call = new BatchCall<O, I>(input);
    this.#queue.push(call);
    this.#schedule();

    return call.promise;
  }

  clear(): void {
    this.#queue = [];
    this.error = false;
    this.#clearDelayTimeout();
  }
}

/**
 * Create a store around a Batch.
 * Each call will be cached and get its own state in addition to being batched.
 */
export function createBatchStore<O, I>(batch: Batch<O, I>): BatchStore<O, I> {
  const signal = new MutableSignal(new Map<string, AsyncResult<O>>());

  function getCacheKey(args: I): string {
    return stableStringify(args);
  }

  function update(cacheKey: string, state: AsyncResult<O>) {
    signal.mutate((cache) => {
      cache.set(cacheKey, state);
    });
  }

  function invalidate(inputs?: I[]): void {
    signal.mutate((cache) => {
      if (Array.isArray(inputs)) {
        // Invalidate the specific calls.
        for (const input of inputs) {
          cache.delete(getCacheKey(input));
        }
      } else {
        // Invalidate all calls.
        cache.clear();
      }
    });
  }

  async function enqueue(input: I): Promise<void> {
    const cacheKey = getCacheKey(input);

    // If this call already has a state, return early.
    const cache = signal.get();
    if (cache.has(cacheKey)) {
      return;
    }

    try {
      // Set the state to loading.
      update(cacheKey, { isLoading: true });

      // Wait for the batch to process this call.
      const result = await batch.get(input);

      // Set the state to the result.
      update(cacheKey, { isLoading: false, data: result });
    } catch (error) {
      // // TODO: Differentiate whole batch errors from individual errors.
      // if (batch.error) {
      //   // If the whole batch errored, clear the state.
      //   // TODO: Keep track of retries and only clear the state a few times because it will be retried each time.
      //   //       Also implement exponential backoff to delay retries to avoid hammering `resolveUsers`.
      //   update(cacheKey, undefined);
      // } else {
      //   // Otherwise, keep individual errors to avoid repeatedly loading the same error.
      //   update(cacheKey, {
      //     isLoading: false,
      //     error: error as Error,
      //   });
      // }

      // If there was an error (for various reasons), set the state to the error.
      update(cacheKey, {
        isLoading: false,
        error: error as Error,
      });
    }
  }

  function fill(input: I, data: O): void {
    const cacheKey = getCacheKey(input);
    update(cacheKey, { isLoading: false, data });
  }

  function getItemState(input: I): AsyncResult<O> | undefined {
    const cacheKey = getCacheKey(input);
    const cache = signal.get();
    return cache.get(cacheKey);
  }

  function getData(input: I): O | undefined {
    const cacheKey = getCacheKey(input);
    const cache = signal.get();
    return cache.get(cacheKey)?.data;
  }

  /** @internal - Only for testing */
  function _cacheKeys() {
    const cache = signal.get();
    return [...cache.keys()];
  }

  return {
    subscribe: signal.subscribe,
    enqueue,
    fill,
    getItemState,
    getData,
    invalidate,

    batch,
    _cacheKeys,
  };
}
