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
  create(key: string): AsyncCacheItem<TData, TError>;
  get(key: string): Promise<AsyncResolvedState<TData, TError>>;
  getState(key: string): AsyncState<TData, TError> | undefined;
  invalidate(key: string, options?: InvalidateOptions<TData>): void;
  revalidate(
    key: string,
    options?: InvalidateOptions<TData>
  ): Promise<AsyncResolvedState<TData, TError>>;
  subscribe(
    key: string,
    callback: Callback<AsyncState<TData, TError>>
  ): UnsubscribeCallback;
  has(key: string): boolean;
  clear(): void;
};

const noop = () => {};

export function isDifferentState(a: AsyncState, b: AsyncState): boolean {
  if (
    a.isLoading !== b.isLoading ||
    (a.data === undefined) !== (b.data === undefined) ||
    (a.error === undefined) !== (b.error === undefined)
  ) {
    return true;
  } else {
    // This might not be true, `data` and `error` would have to be
    // deeply compared to know that. But in our use-case, `data` and
    // `error` can't change without being set to `undefined` first or
    // `isLoading` also changing in between.
    return false;
  }
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
      if (context.rollbackOptimisticDataOnError) {
        context.data = context.previousNonOptimisticData;
      }

      context.error = error as TError;
      context.isInvalid = true;
    }

    context.rollbackOptimisticDataOnError = false;
    context.promise = undefined;
    context.isLoading = false;

    if (context.scheduledInvalidation) {
      const scheduledInvalidation = context.scheduledInvalidation;
      context.scheduledInvalidation = undefined;
      invalidate(scheduledInvalidation);
    } else {
      notify();
    }
  }

  function invalidate(options: InvalidateOptions<TData> = {}) {
    if (context.promise) {
      context.scheduledInvalidation = options;
    } else if (!context.scheduledInvalidation && !context.error) {
      context.isInvalid = true;
      context.error = undefined;

      context.data =
        typeof options.setData === "function"
          ? options.setData(context.data)
          : options.setData === false
          ? context.data
          : undefined;

      if (options.setData && options.setDataOptimistically) {
        context.rollbackOptimisticDataOnError = true;
      }

      notify();
    }
  }

  async function get() {
    if (context.isInvalid) {
      const isDuplicate = context.lastExecutedAt
        ? Date.now() - context.lastExecutedAt < deduplicationInterval
        : false;

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
    create,
    get,
    getState,
    invalidate,
    revalidate,
    subscribe,
    has,
    clear,
  };
}
