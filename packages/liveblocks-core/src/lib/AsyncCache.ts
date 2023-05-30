import type { Callback, Observable, UnsubscribeCallback } from "./EventSource";
import { makeEventSource } from "./EventSource";

const DEDUPLICATION_INTERVAL = 2000;

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

type AsyncFunction<T, A extends any[] = any[]> = (...args: A) => Promise<T>;

type AsyncCacheOptions = {
  deduplicationInterval?: number;
};

type AsyncCacheItemOptions = WithRequired<
  AsyncCacheOptions,
  "deduplicationInterval"
>;

type InvalidateOptions<T> =
  | { clearData?: false; optimisticData?: never }
  | {
      clearData?: never;
      optimisticData: T | ((data: T | undefined) => T | undefined);
    };

type AsyncStateEmpty = {
  isLoading: false;
  data?: never;
  error?: never;
};

type AsyncStateLoading<T> = {
  isLoading: true;
  data?: T;
  error?: never;
};

type AsyncStateSuccess<T> = {
  isLoading: false;
  data: T;
  error?: never;
};

type AsyncStateError<T, E> = {
  isLoading: false;
  data?: T;
  error: E;
};

export type AsyncState<T, E> =
  | AsyncStateEmpty
  | AsyncStateLoading<T>
  | AsyncStateSuccess<T>
  | AsyncStateError<T, E>;

type AsyncStateResolved<T, E> = AsyncStateSuccess<T> | AsyncStateError<T, E>;

type AsyncCacheItemContext<T, E> = AsyncState<T, E> & {
  isInvalid: boolean;
  scheduledInvalidation?: InvalidateOptions<T>;
  rollbackOptimisticDataOnError?: boolean;
  promise?: Promise<T>;
  lastInvokedAt?: number;
  previousState: AsyncState<T, E>;
  previousNonOptimisticData?: T;
};

export type AsyncCacheItem<T, E> = Observable<AsyncState<T, E>> & {
  get(): Promise<AsyncStateResolved<T, E>>;
  getState(): AsyncState<T, E>;
  invalidate(options?: InvalidateOptions<T>): void;
  revalidate(options?: InvalidateOptions<T>): Promise<AsyncStateResolved<T, E>>;
};

export type AsyncCache<T, E> = {
  /**
   * Returns a promise which resolves with the state of the key.
   *
   * @param key The key to get.
   */
  get(key: string): Promise<AsyncStateResolved<T, E>>;

  /**
   * Returns the current state of the key synchronously.
   *
   * @param key The key to get the state of.
   */
  getState(key: string): AsyncState<T, E> | undefined;

  /**
   * Marks a key as invalid, which means that the next
   * {@link AsyncCache.get} call will re-invoke the function.
   *
   * @param key The key to invalidate.
   * @param options.clearData Whether to clear the cached data.
   * @param options.optimisticData Set data optimistically but rollback if there's an error.
   */
  invalidate(key: string, options?: InvalidateOptions<T>): void;

  /**
   * Calls {@link AsyncCache.invalidate} and then {@link AsyncCache.get}.
   *
   * @param key The key to revalidate.
   * @param options.clearData Whether to clear the cached data.
   * @param options.optimisticData Set data optimistically but rollback if there's an error.
   */
  revalidate(
    key: string,
    options?: InvalidateOptions<T>
  ): Promise<AsyncStateResolved<T, E>>;

  /**
   * Subscribes to a key's changes.
   *
   * @param key The key to subscribe to.
   * @param callback The function invoked on every change.
   */
  subscribe(
    key: string,
    callback: Callback<AsyncState<T, E>>
  ): UnsubscribeCallback;

  /**
   * Returns whether a key already exists in the cache.
   *
   * @param key The key to look for.
   */
  has(key: string): boolean;

  /**
   * Clears all keys.
   */
  clear(): void;
};

const noop = () => {};

export function isDifferentState(
  a: AsyncState<unknown, unknown>,
  b: AsyncState<unknown, unknown>
): boolean {
  // This might not be true, `data` and `error` would have to be
  // deeply compared to know that. But in our use-case, `data` and
  // `error` can't change without being set to `undefined` first or
  // `isLoading` also changing in between or at the same time.
  return (
    a.isLoading !== b.isLoading ||
    (a.data === undefined) !== (b.data === undefined) ||
    (a.error === undefined) !== (b.error === undefined)
  );
}

function createCacheItem<T, E>(
  key: string,
  asyncFunction: AsyncFunction<T>,
  { deduplicationInterval }: AsyncCacheItemOptions
): AsyncCacheItem<T, E> {
  const context: AsyncCacheItemContext<T, E> = {
    isLoading: false,
    isInvalid: true,
    previousState: { isLoading: false },
  };
  const eventSource = makeEventSource<AsyncState<T, E>>();

  function notify() {
    const state = getState();

    // We only notify subscribers if the cache has changed.
    if (isDifferentState(context.previousState, state)) {
      context.previousState = state;
      eventSource.notify(state);
    }
  }

  function invoke() {
    context.lastInvokedAt = Date.now();
    context.error = undefined;
    context.isLoading = true;
    context.isInvalid = true;
    context.promise = asyncFunction(key);

    // We notify subscribers that the promise
    // started (changing `isLoading`).
    notify();
  }

  async function resolve() {
    try {
      const data = await context.promise;

      context.data = data;
      context.previousNonOptimisticData = data;
      context.error = undefined;
      context.isInvalid = false;
    } catch (error) {
      // We updated `data` optimistically but there's now an
      // error so we rollback to the previous non-optimistic `data`.
      if (context.rollbackOptimisticDataOnError) {
        context.data = context.previousNonOptimisticData;
      }

      // We keep the key as invalid because there was an error.
      context.isInvalid = true;
      context.error = error as E;
    }

    context.rollbackOptimisticDataOnError = false;
    context.promise = undefined;
    context.isLoading = false;

    if (context.scheduledInvalidation) {
      // If there was an invalidation made during
      // the promise, we scheduled it to now.
      const scheduledInvalidation = context.scheduledInvalidation;
      context.scheduledInvalidation = undefined;
      invalidate(scheduledInvalidation);
    } else {
      // We notify subscribers that the promise resolved
      // (changing `isLoading` and either `data` or `error`).
      notify();
    }
  }

  function invalidate(options: InvalidateOptions<T> = {}) {
    if (context.promise) {
      // If there is a promise pending, we schedule the
      // invalidation for when the promise resolves.
      context.scheduledInvalidation = options;
    } else if (!context.scheduledInvalidation && !context.error) {
      // We only invalidate if there's not an
      // invalidation still scheduled or an error.
      context.isInvalid = true;
      context.error = undefined;

      // If we set `data` optimistically, we specify that we
      // should rollback `data` if the next resolve is an error.
      if (options.optimisticData !== undefined) {
        context.rollbackOptimisticDataOnError = true;
        context.data =
          options.optimisticData instanceof Function
            ? options.optimisticData(context.data)
            : options.optimisticData;
      } else if (options.clearData !== false) {
        context.data = undefined;
      }

      // We notify subscribers that there was an
      // invalidation (potentially changind `data`).
      notify();
    }
  }

  async function get() {
    // If a key isn't invalid (never called, errored,
    // invalidated...), we just return its cache.
    if (context.isInvalid) {
      const isDuplicate = context.lastInvokedAt
        ? Date.now() - context.lastInvokedAt < deduplicationInterval
        : false;

      // We only invoke the provided function if there's not
      // a promise pending already or if a previous invocation
      // was already made within the deduplication interval.
      if (!context.promise && !isDuplicate) {
        invoke();
      }

      if (context.promise) {
        await resolve();
      }
    }

    return getState() as AsyncStateResolved<T, E>;
  }

  function revalidate(options?: InvalidateOptions<T>) {
    invalidate(options);

    return get();
  }

  function getState() {
    return {
      isLoading: context.isLoading,
      data: context.data,
      error: context.error,
    } as AsyncState<T, E>;
  }

  return {
    ...eventSource.observable,
    get,
    getState,
    invalidate,
    revalidate,
  };
}

export function createAsyncCache<T, E>(
  asyncFunction: AsyncFunction<T, [string]>,
  options?: AsyncCacheOptions
): AsyncCache<T, E> {
  const cache = new Map<string, AsyncCacheItem<T, E>>();
  const cacheItemOptions: AsyncCacheItemOptions = {
    deduplicationInterval:
      options?.deduplicationInterval ?? DEDUPLICATION_INTERVAL,
  };

  /**
   * Returns the {@link AsyncCacheItem} for a key,
   * and create it if it doesn't exist yet.
   */
  function create(key: string) {
    let cacheItem = cache.get(key);

    if (cacheItem) {
      return cacheItem;
    }

    cacheItem = createCacheItem(key, asyncFunction, cacheItemOptions);
    cache.set(key, cacheItem);

    return cacheItem;
  }

  function get(key: string) {
    return create(key).get();
  }

  function getState(key: string) {
    return cache.get(key)?.getState();
  }

  function invalidate(key: string, options?: InvalidateOptions<T>) {
    cache.get(key)?.invalidate(options);
  }

  function revalidate(key: string, options?: InvalidateOptions<T>) {
    return create(key).revalidate(options);
  }

  function subscribe(key: string, callback: Callback<AsyncState<T, E>>) {
    return create(key).subscribe(callback) ?? noop;
  }

  function has(key: string) {
    return cache.has(key);
  }

  function clear() {
    cache.clear();
  }

  return {
    get,
    getState,
    invalidate,
    revalidate,
    subscribe,
    has,
    clear,
  };
}
