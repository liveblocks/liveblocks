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

type InvalidateOptions<TData = any> =
  | { setData?: never; setDataOptimistically?: never }
  | {
      setData: false | ((data: TData | undefined) => TData | undefined);
      setDataOptimistically?: boolean;
    };

export type AsyncState<TData = any, TError = any> = {
  isLoading: boolean;
  data?: TData;
  error?: TError;
};

type AsyncResolvedState<TData = any, TError = any> = AsyncState<
  TData,
  TError
> & {
  isLoading: false;
};

type AsyncCacheItemContext<TData, TError> = AsyncState<TData, TError> & {
  isInvalid: boolean;
  scheduledInvalidation?: InvalidateOptions<TData>;
  rollbackOptimisticDataOnError?: boolean;
  promise?: Promise<TData>;
  lastExecutedAt?: number;
  previousState: AsyncState<TData, TError>;
  previousNonOptimisticData?: TData;
};

export type AsyncCacheItem<TData = any, TError = any> = Observable<
  AsyncState<TData, TError>
> & {
  get(): Promise<AsyncResolvedState<TData, TError>>;
  getState(): AsyncState<TData, TError>;
  invalidate(options?: InvalidateOptions<TData>): void;
  revalidate(
    options?: InvalidateOptions<TData>
  ): Promise<AsyncResolvedState<TData, TError>>;
};

export type AsyncCache<TData = any, TError = any> = {
  /**
   * Returns a promise which resolves with the state of the key.
   *
   * @param key The key to get.
   */
  get(key: string): Promise<AsyncResolvedState<TData, TError>>;

  /**
   * Returns the current state of the key synchronously.
   *
   * @param key The key to get the state of.
   */
  getState(key: string): AsyncState<TData, TError> | undefined;

  /**
   * Marks a key as invalid, which means that the next
   * {@link AsyncCache.get} call will re-execute the function.
   *
   * @param key The key to invalidate.
   * @param options.setData Whether to clear the cached data or not, or to set
   *                        it freely (e.g. as an optimistic version of its future)
   * @param options.setDataOptimistically Whether to rollback the data if there's an error.
   */
  invalidate(key: string, options?: InvalidateOptions<TData>): void;

  /**
   * Calls {@link AsyncCache.invalidate} and then {@link AsyncCache.get}.
   *
   * @param key The key to revalidate.
   * @param options.setData Whether to clear the cached data or not, or to set
   *                        it freely (e.g. as an optimistic version of its future)
   * @param options.setDataOptimistically Whether to rollback the data if there's an error.
   */
  revalidate(
    key: string,
    options?: InvalidateOptions<TData>
  ): Promise<AsyncResolvedState<TData, TError>>;

  /**
   * Subscribes to a key's changes.
   *
   * @param key The key to subscribe to.
   * @param callback The function invoked on every change.
   */
  subscribe(
    key: string,
    callback: Callback<AsyncState<TData, TError>>
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

export function isDifferentState(a: AsyncState, b: AsyncState): boolean {
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

function createCacheItem<TData = any, TError = any>(
  key: string,
  asyncFunction: AsyncFunction<TData>,
  { deduplicationInterval }: AsyncCacheItemOptions
): AsyncCacheItem<TData, TError> {
  const context: AsyncCacheItemContext<TData, TError> = {
    isLoading: false,
    isInvalid: true,
    previousState: { isLoading: false },
  };
  const eventSource = makeEventSource<AsyncState<TData, TError>>();

  function notify() {
    const state = getState();

    // We only notify subscribers if the cache has changed.
    if (isDifferentState(context.previousState, state)) {
      context.previousState = state;
      eventSource.notify(state);
    }
  }

  function execute() {
    context.lastExecutedAt = Date.now();
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
      context.error = error as TError;
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

  function invalidate(options: InvalidateOptions<TData> = {}) {
    if (context.promise) {
      // If there is a promise pending, we schedule the
      // invalidation for when the promise resolves.
      context.scheduledInvalidation = options;
    } else if (!context.scheduledInvalidation && !context.error) {
      // We only invalidate if there's not an
      // invalidation still scheduled or an error.
      context.isInvalid = true;
      context.error = undefined;

      context.data =
        typeof options.setData === "function"
          ? options.setData(context.data)
          : options.setData === false
          ? context.data
          : undefined;

      // If we set `data` optimistically, we specify that we
      // should rollback `data` if the next resolve is an error.
      if (options.setData && options.setDataOptimistically) {
        context.rollbackOptimisticDataOnError = true;
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
      const isDuplicate = context.lastExecutedAt
        ? Date.now() - context.lastExecutedAt < deduplicationInterval
        : false;

      // We only execute the provided function if there's not
      // a promise pending already or if a previous execution
      // was already made within the deduplication interval.
      if (!context.promise && !isDuplicate) {
        execute();
      }

      if (context.promise) {
        await resolve();
      }
    }

    return getState() as AsyncResolvedState<TData, TError>;
  }

  function revalidate(options?: InvalidateOptions<TData>) {
    invalidate(options);

    return get();
  }

  function getState() {
    return {
      isLoading: context.isLoading,
      data: context.data,
      error: context.error,
    } as AsyncState<TData, TError>;
  }

  return {
    ...eventSource.observable,
    get,
    getState,
    invalidate,
    revalidate,
  };
}

export function createAsyncCache<TData = any, TError = any>(
  asyncFunction: AsyncFunction<TData, [string]>,
  options?: AsyncCacheOptions
): AsyncCache<TData, TError> {
  const cache = new Map<string, AsyncCacheItem<TData, TError>>();
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

  function invalidate(key: string, options?: InvalidateOptions<TData>) {
    cache.get(key)?.invalidate(options);
  }

  function revalidate(key: string, options?: InvalidateOptions<TData>) {
    return create(key).revalidate(options);
  }

  function subscribe(
    key: string,
    callback: Callback<AsyncState<TData, TError>>
  ) {
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
