import type { AsyncCache, AsyncState } from "@liveblocks/core";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";

import { useInitial } from "./use-initial";

const DEFAULT_ASYNC_STATE: AsyncState = {
  isLoading: false,
  data: undefined,
  error: undefined,
};

export type UseAsyncCacheOptions = {
  keepPreviousDataWhileLoading?: boolean;
  suspense?: boolean;
};

type PreviousData<TData> = {
  key: string | null;
  data?: TData;
};

const noop = () => {};

// TODO: If suspense:true, update the returned AsyncState type to never be loading
export function useAsyncCache<TData = any, TError = any>(
  cache: AsyncCache<TData, TError>,
  key: string | null,
  options?: UseAsyncCacheOptions
) {
  const frozenOptions = useInitial(options);
  const cacheItem = useMemo(() => {
    if (key === null) {
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
  const getSnapshot = useCallback(
    () =>
      cacheItem?.getState() ??
      (DEFAULT_ASYNC_STATE as AsyncState<TData, TError>),
    [cacheItem]
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const previousData = useRef<PreviousData<TData>>();

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
    state.data = previousData.current.data;
  }

  const invalidate = useCallback(() => cacheItem?.invalidate(), [cacheItem]);

  const revalidate = useCallback(() => cacheItem?.revalidate(), [cacheItem]);

  const getState = useCallback(() => cacheItem?.getState(), [cacheItem]);

  return {
    ...state,
    invalidate,
    revalidate,
    getState,
  };
}
