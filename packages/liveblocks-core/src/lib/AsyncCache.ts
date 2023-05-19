import type { Callback, Observable, UnsubscribeCallback } from "./EventSource";
import { makeEventSource } from "./EventSource";

type AsyncFunction<T, A extends any[] = any[]> = (...args: A) => Promise<T>;

export type AsyncState<TData = any, TError = any> =
  | {
      status: "idle" | "loading";
      data?: TData;
      error?: TError;
    }
  | {
      status: "error";
      data: undefined;
      error: TError;
    }
  | {
      status: "success";
      data: TData;
      error: undefined;
    };

type AsyncCacheItemContext<TData, TError> = AsyncState<TData, TError> & {
  promise?: Promise<TData>;
};

export type AsyncCacheItem<TData = any, TError = any> = Observable<
  AsyncState<TData, TError>
> & {
  get(): Promise<
    Extract<
      AsyncState<TData, TError>,
      { status: "success" } | { status: "error" }
    >
  >;
  getState(): AsyncState<TData, TError>;
  revalidate(): Promise<void>;
};

export type AsyncCache<TData = any, TError = any> = {
  create(key: string): AsyncCacheItem<TData, TError>;
  get(
    key: string
  ): Promise<
    Extract<
      AsyncState<TData, TError>,
      { status: "success" } | { status: "error" }
    >
  >;
  getState(key: string): AsyncState<TData, TError> | undefined;
  revalidate(key: string): Promise<void>;
  subscribe(
    key: string,
    callback: Callback<AsyncState<TData, TError>>
  ): UnsubscribeCallback;
};

const noop = () => {};

function createCacheItem<TData = any, TError = any>(
  key: string,
  asyncFunction: AsyncFunction<TData>
): AsyncCacheItem<TData, TError> {
  const context: AsyncCacheItemContext<TData, TError> = {
    status: "idle",
  };
  const eventSource = makeEventSource<AsyncState<TData, TError>>();

  function notify() {
    eventSource.notify(getState());
  }

  function setSuccess(data: TData) {
    context.status = "success";
    context.data = data;
    context.error = undefined;
    notify();
  }

  function setError(error: TError) {
    context.status = "error";
    context.data = undefined;
    context.error = error;
    notify();
  }

  function execute() {
    context.error = undefined;
    context.status = "loading";
    context.promise = asyncFunction(key);
    notify();
  }

  async function revalidate() {
    try {
      if (context.status !== "loading") {
        execute();
      }

      setSuccess(await (context.promise as Promise<TData>));
    } catch (error) {
      setError(error as TError);
    }
  }

  async function get() {
    if (!context.data) {
      await revalidate();
    }

    return getState() as Extract<
      AsyncState<TData, TError>,
      { status: "success" } | { status: "error" }
    >;
  }

  function getState(): AsyncState<TData, TError> {
    return {
      data: context.data,
      error: context.error,
      status: context.status,
    } as AsyncState<TData, TError>;
  }

  return {
    ...eventSource.observable,
    get,
    getState,
    revalidate,
  };
}

export function createAsyncCache<TData = any, TError = any>(
  asyncFunction: AsyncFunction<TData, [string]>
): AsyncCache<TData, TError> {
  const cache = new Map<string, AsyncCacheItem<TData, TError>>();

  function create(key: string) {
    let cacheItem = cache.get(key);

    if (cacheItem) {
      return cacheItem;
    }

    cacheItem = createCacheItem(key, asyncFunction);
    cache.set(key, cacheItem);

    return cacheItem;
  }

  async function get(key: string) {
    return create(key).get();
  }

  function getState(key: string) {
    return cache.get(key)?.getState();
  }

  async function revalidate(key: string) {
    await cache.get(key)?.revalidate();
  }

  function subscribe(
    key: string,
    callback: Callback<AsyncState<TData, TError>>
  ) {
    return cache.get(key)?.subscribe(callback) ?? noop;
  }

  return {
    create,
    get,
    getState,
    revalidate,
    subscribe,
  };
}
