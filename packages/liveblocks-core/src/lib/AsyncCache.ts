import type { Callback, Observable, UnsubscribeCallback } from "./EventSource";
import { makeEventSource } from "./EventSource";

const DEDUPLICATION_INTERVAL = 2000;
const KEEP_PREVIOUS_DATA = false;

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
  | {
      keepPreviousData: true;
      setOptimisticData?: never;
    }
  | {
      keepPreviousData?: false;
      setOptimisticData?: (data: TData | undefined) => TData | undefined;
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
  promise?: Promise<TData>;
  lastExecutedAt?: number;
  previousState: AsyncState<TData, TError>;
  previousData?: TData;
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
  invalidate(key: string, options?: InvalidateOptions): void;
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
      context.error = undefined;
      context.isInvalid = false;
    } catch (error) {
      context.error = error as TError;
      context.isInvalid = true;
    }

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

  function invalidate(options?: InvalidateOptions<TData>) {
    const resolvedOptions: WithRequired<
      InvalidateOptions<TData>,
      "keepPreviousData"
    > = { keepPreviousData: KEEP_PREVIOUS_DATA, ...options };

    if (context.promise) {
      context.scheduledInvalidation = resolvedOptions;
    } else if (!context.scheduledInvalidation && !context.error) {
      context.isInvalid = true;
      context.error = undefined;

      if (resolvedOptions.setOptimisticData) {
        context.data = resolvedOptions.setOptimisticData(context.data);
      } else if (!resolvedOptions.keepPreviousData) {
        context.data = undefined;
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

  function invalidate(key: string, options?: InvalidateOptions) {
    cache.get(key)?.invalidate(options);
  }

  function revalidate(key: string, options?: InvalidateOptions) {
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
