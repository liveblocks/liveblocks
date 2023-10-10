import type { Callback, Observable, UnsubscribeCallback } from "./EventSource";
import { makeEventSource } from "./EventSource";
import { shallow } from "./shallow";

type AsyncCacheFunction<T, A extends any[] = any[]> = (
  ...args: A
) => T | Promise<T>;

type AsyncCacheOptions<T, E> = {
  isStateEqual?: (a: AsyncState<T, E>, b: AsyncState<T, E>) => boolean;
};

export type AsyncStateInitial = {
  readonly isLoading: false;
  readonly data?: never;
  readonly error?: never;
};

export type AsyncStateLoading<T> = {
  readonly isLoading: true;
  readonly data?: T;
  readonly error?: never;
};

export type AsyncStateSuccess<T> = {
  readonly isLoading: false;
  readonly data: T;
  readonly error?: never;
};

export type AsyncStateError<T, E> = {
  readonly isLoading: false;
  readonly data?: T;
  readonly error: E;
};

export type AsyncState<T, E> =
  | AsyncStateInitial
  | AsyncStateLoading<T>
  | AsyncStateSuccess<T>
  | AsyncStateError<T, E>;

export type AsyncStateResolved<T, E> =
  | AsyncStateSuccess<T>
  | AsyncStateError<T, E>;

type AsyncCacheItemContext<T> = {
  promise?: Promise<T>;
  isInvalid: boolean;
};

export type AsyncCacheItem<T, E> = Observable<AsyncState<T, E>> & {
  get(): Promise<AsyncStateResolved<T, E>>;
  getState(): AsyncState<T, E>;
  revalidate(): Promise<AsyncStateResolved<T, E>>;
};

export type AsyncCache<T, E> = {
  /**
   * @private
   *
   * Creates a key in the cache.
   *
   * @param key The key to create.
   * @param asyncFunction Override the cache's function for this key.
   */
  create(
    key: string,
    asyncFunction?: AsyncCacheFunction<T, [string]>
  ): AsyncCacheItem<T, E>;

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
   * Revalidates the key.
   *
   * @param key The key to revalidate.
   */
  revalidate(key: string): Promise<AsyncStateResolved<T, E>>;

  /**
   * Subscribes to the key's changes.
   *
   * @param key The key to subscribe to.
   * @param callback The function invoked on every change.
   */
  subscribe(
    key: string,
    callback: Callback<AsyncState<T, E>>
  ): UnsubscribeCallback;

  /**
   * Subscribes to the key's changes once.
   *
   * @param key The key to subscribe to.
   * @param callback The function invoked on every change.
   */
  subscribeOnce(
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

export function isShallowEqual(
  a: AsyncState<unknown, unknown>,
  b: AsyncState<unknown, unknown>
): boolean {
  if (
    a.isLoading !== b.isLoading ||
    (a.data === undefined) !== (b.data === undefined) ||
    (a.error === undefined) !== (b.error === undefined)
  ) {
    return false;
  } else {
    return shallow(a.data, b.data) && shallow(a.error, b.error);
  }
}

function createCacheItem<T, E>(
  key: string,
  asyncFunction: AsyncCacheFunction<T, [string]>,
  options?: AsyncCacheOptions<T, E>
): AsyncCacheItem<T, E> {
  const $asyncFunction = async () => asyncFunction(key);
  const context: AsyncCacheItemContext<T> = {
    isInvalid: true,
  };
  let state: AsyncState<T, E> = { isLoading: false };
  let previousState: AsyncState<T, E> = { isLoading: false };
  const eventSource = makeEventSource<AsyncState<T, E>>();

  /**
   * @internal
   */
  function notify() {
    const isEqual = options?.isStateEqual ?? isShallowEqual;

    // We only notify subscribers if the cache has changed.
    if (!isEqual(previousState, state)) {
      previousState = state;
      eventSource.notify(state);
    }
  }

  /**
   * @internal
   */
  async function resolve() {
    // Return early if there's nothing to resolve.
    if (!context.promise) {
      return;
    }

    try {
      const data = await context.promise;

      context.isInvalid = false;

      state = {
        isLoading: false,
        data,
      };
    } catch (error) {
      state = {
        isLoading: false,
        data: state.data,
        error: error as E,
      };
    }

    context.promise = undefined;

    // We notify subscribers that the promise resolved, either as a success or an error.
    notify();
  }

  async function revalidate(): Promise<AsyncStateResolved<T, E>> {
    context.isInvalid = true;

    // We call the function again because it was marked invalid.
    return get();
  }

  async function get() {
    // If a key isn't invalid (never called, errored...), we just return its cache.
    if (context.isInvalid) {
      // We only invoke the provided function if there's not a promise pending already.
      if (!context.promise) {
        context.isInvalid = true;
        context.promise = $asyncFunction();

        state = { isLoading: true, data: state.data };

        // We notify subscribers that the promise started.
        notify();
      }

      await resolve();
    }

    return getState() as AsyncStateResolved<T, E>;
  }

  function getState() {
    return state;
  }

  return {
    ...eventSource.observable,
    get,
    getState,
    revalidate,
  };
}

export function createAsyncCache<T, E>(
  asyncFunction: AsyncCacheFunction<T, [string]>,
  options?: AsyncCacheOptions<T, E>
): AsyncCache<T, E> {
  const cache = new Map<string, AsyncCacheItem<T, E>>();

  function create(key: string) {
    let cacheItem = cache.get(key);

    if (cacheItem) {
      return cacheItem;
    }

    cacheItem = createCacheItem(key, asyncFunction, options);
    cache.set(key, cacheItem);

    return cacheItem;
  }

  function get(key: string) {
    return create(key).get();
  }

  function getState(key: string) {
    return cache.get(key)?.getState();
  }

  function revalidate(key: string) {
    return create(key).revalidate();
  }

  function subscribe(key: string, callback: Callback<AsyncState<T, E>>) {
    return create(key).subscribe(callback) ?? noop;
  }

  function subscribeOnce(key: string, callback: Callback<AsyncState<T, E>>) {
    return create(key).subscribeOnce(callback) ?? noop;
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
    revalidate,
    subscribe,
    subscribeOnce,
    has,
    clear,
  };
}
