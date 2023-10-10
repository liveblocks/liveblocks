import type {
  AsyncCache,
  AsyncState,
  AsyncStateInitial,
  AsyncStateResolved,
} from "@liveblocks/core";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim/index.js";

import { useInitial } from "./use-initial";

const INITIAL_ASYNC_STATE: AsyncStateInitial = {
  isLoading: false,
  data: undefined,
  error: undefined,
};

export type UseAsyncCacheOptions = {
  keepPreviousDataWhileLoading?: boolean;
  suspense?: boolean;
};

type UseAsyncCacheState<
  T,
  E,
  O extends UseAsyncCacheOptions = UseAsyncCacheOptions,
> = O extends {
  suspense: true;
}
  ? Exclude<AsyncState<T, E>, { isLoading: true }>
  : AsyncState<T, E>;

export type UseAsyncCacheResponse<
  T,
  E,
  O extends UseAsyncCacheOptions = UseAsyncCacheOptions,
> = UseAsyncCacheState<T, E, O> & {
  /**
   * Returns the current state of the key synchronously.
   */
  getState: () => AsyncState<T, E>;

  /**
   * Revalidates the key.
   */
  revalidate(): Promise<AsyncStateResolved<T, E>>;
};

type PreviousData<T> = {
  key: string | null;
  data?: T;
};

const noop = () => {};

export function useAsyncCache<T, E, O extends UseAsyncCacheOptions>(
  cache: AsyncCache<T, E> | undefined,
  key: string | null,
  options?: O
): UseAsyncCacheResponse<T, E, O> {
  const frozenOptions = useInitial(options);
  const cacheItem = useMemo(() => {
    if (key === null || !cache) {
      return null;
    }

    const cacheItem = cache.create(key);
    void cacheItem.get();

    return cacheItem;
  }, [cache, key]);

  const subscribe = useCallback(
    (callback: () => void) => cacheItem?.subscribe(callback) ?? noop,
    [cacheItem]
  );

  const getState = useCallback(
    () => cacheItem?.getState() ?? INITIAL_ASYNC_STATE,
    [cacheItem]
  );

  const revalidate = useCallback(() => cacheItem?.revalidate(), [cacheItem]);

  const state = useSyncExternalStore(subscribe, getState, getState);
  const previousData = useRef<PreviousData<T>>();
  let data = state.data;

  useEffect(() => {
    previousData.current = { key, data: state.data };
  }, [key, state]);

  if (frozenOptions?.suspense && state.isLoading && cacheItem) {
    throw new Promise<void>((resolve) => {
      cacheItem.subscribeOnce(() => resolve());
    });
  }

  if (
    state.isLoading &&
    frozenOptions?.keepPreviousDataWhileLoading &&
    typeof state.data === "undefined" &&
    previousData.current?.key !== key &&
    typeof previousData.current?.data !== "undefined"
  ) {
    data = previousData.current.data;
  }

  if (frozenOptions?.suspense && state.error) {
    throw state.error;
  }

  return {
    isLoading: state.isLoading,
    data,
    error: state.error,
    getState,
    revalidate,
  } as UseAsyncCacheResponse<T, E, O>;
}
