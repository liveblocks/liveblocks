import type { Callback, Observable, UnsubscribeCallback } from "./EventSource";
import { makeEventSource } from "./EventSource";
import { shallow } from "./shallow";

type AsyncFunction<T, A extends any[] = any[]> = (...args: A) => Promise<T>;

type OptimisticData<T> = T | ((data: T | undefined) => T);

export type Mutation<T, M = undefined> = (
  data: T | undefined,
  key: string
) => Promise<MutationResponse<T, M>>;

export type MutationResponse<T, M = undefined> = {
  data: T;
  mutation?: M;
};

export type MutateResponse<T, M = undefined> = M extends undefined
  ? { data: T }
  : { data: T; mutation: M };

export type MutateOptions<T> = {
  optimisticData: OptimisticData<T>;
};

export type RevalidateOptions<T> = {
  optimisticData: OptimisticData<T>;
};

type AsyncCacheOptions<T, E> = {
  compare?: (a: AsyncState<T, E>, b: AsyncState<T, E>) => boolean;
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
  rollbackOptimisticDataOnError?: boolean;
  previousNonOptimisticData?: T;
};

export type AsyncCacheItem<T, E> = Observable<AsyncState<T, E>> & {
  get(): Promise<AsyncStateResolved<T, E>>;
  getState(): AsyncState<T, E>;
  revalidate(options?: RevalidateOptions<T>): Promise<AsyncStateResolved<T, E>>;
  mutate<M>(
    mutation: Mutation<T, M>,
    options?: RevalidateOptions<T>
  ): Promise<MutateResponse<T, M>>;
};

export type AsyncCache<T, E> = {
  /**
   * @private
   *
   * Creates a key in the cache.
   *
   * @param key The key to create.
   */
  create(key: string): AsyncCacheItem<T, E>;

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
   * @param options.optimisticData Set data optimistically but rollback if there's an error.
   */
  revalidate(
    key: string,
    options?: RevalidateOptions<T>
  ): Promise<AsyncStateResolved<T, E>>;

  /**
   * Mutates the key.
   *
   * @param key The key to mutate.
   * @param mutation An asynchronous function to wait on, setting the data manually if it returns any.
   * @param options.optimisticData Set data optimistically but rollback if there's an error.
   */
  mutate<M = undefined>(
    key: string,
    mutation: Mutation<T, M>,
    options?: MutateOptions<T>
  ): Promise<MutateResponse<T, M>>;

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

export function isStateEqual(
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
  asyncFunction: AsyncFunction<T>,
  options?: AsyncCacheOptions<T, E>
): AsyncCacheItem<T, E> {
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
    const compare = options?.compare ?? isStateEqual;

    // We only notify subscribers if the cache has changed.
    if (!compare(previousState, state)) {
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
      context.previousNonOptimisticData = data;

      state = {
        isLoading: false,
        data,
      };
    } catch (error) {
      state = {
        isLoading: false,
        data: context.rollbackOptimisticDataOnError
          ? // If we updated `data` optimistically but there's now an
            // error, we rollback to the previous non-optimistic `data`.
            context.previousNonOptimisticData
          : // Otherwise, we keep the current `data`.
            state.data,
        error: error as E,
      };
    }

    context.rollbackOptimisticDataOnError = false;
    context.promise = undefined;

    // We notify subscribers that the promise resolved, either as a success or an error.
    notify();
  }

  /**
   * @internal
   */
  function setOptimisticData(optimisticData?: OptimisticData<T>) {
    if (!optimisticData) {
      return;
    }

    context.rollbackOptimisticDataOnError = true;
    state = {
      ...state,
      data:
        optimisticData instanceof Function
          ? optimisticData(state.data)
          : optimisticData,
    };
  }

  async function revalidate(
    options?: RevalidateOptions<T>
  ): Promise<AsyncStateResolved<T, E>> {
    context.isInvalid = true;

    // We first set optimistic data if it's provided.
    setOptimisticData(options?.optimisticData);

    // Then we call the function again because it was marked invalid.
    return get();
  }

  async function mutate<M>(
    mutation: Mutation<T, M>,
    options?: MutateOptions<T>
  ) {
    context.isInvalid = true;

    // We first set optimistic data if it's provided.
    setOptimisticData(options?.optimisticData);

    // We catch the mutation errors so we can set the correct non-loading state.
    try {
      state = {
        isLoading: true,
        data: state.data,
      };

      // We notify subscribers that the mutation started.
      notify();

      const { data, mutation: mutationResponse } = await mutation(
        context.previousNonOptimisticData,
        key
      );

      context.isInvalid = false;
      context.previousNonOptimisticData = data;
      context.rollbackOptimisticDataOnError = false;

      state = {
        isLoading: false,
        data,
      };

      // We notify subscribers that the mutation fulfilled.
      notify();

      return {
        data,
        mutation: mutationResponse,
      } as MutateResponse<T, M>;
    } catch (error) {
      state = {
        isLoading: false,
        data: context.rollbackOptimisticDataOnError
          ? // If we updated `data` optimistically but there's now an
            // error, we rollback to the previous non-optimistic `data`.
            (context.previousNonOptimisticData as T)
          : // Otherwise, we keep the current `data`.
            (state.data as T),
      };

      context.rollbackOptimisticDataOnError = false;

      // We notify subscribers that the mutation errored.
      notify();

      // We re-throw the mutation error so it can be handled outside.
      throw error as E;
    }
  }

  async function get() {
    // If a key isn't invalid (never called, errored...), we just return its cache.
    if (context.isInvalid) {
      // We only invoke the provided function if there's not a promise pending already.
      if (!context.promise) {
        context.isInvalid = true;
        context.promise = asyncFunction(key);

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
    mutate,
  };
}

export function createAsyncCache<T, E>(
  asyncFunction: AsyncFunction<T, [string]>,
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

  function revalidate(key: string, options?: RevalidateOptions<T>) {
    return create(key).revalidate(options);
  }

  function mutate<M>(
    key: string,
    mutation: Mutation<T, M>,
    options?: MutateOptions<T>
  ) {
    return create(key).mutate(mutation, options);
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
    create,
    get,
    getState,
    revalidate,
    mutate,
    subscribe,
    has,
    clear,
  };
}
