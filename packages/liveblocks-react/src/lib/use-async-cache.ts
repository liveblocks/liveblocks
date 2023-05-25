import type { AsyncCache, AsyncState } from "@liveblocks/core";
import { useCallback, useMemo } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";

const DEFAULT_ASYNC_STATE: AsyncState = {
  isLoading: false,
  data: undefined,
  error: undefined,
};

const noop = () => {};

// TODO: Support changing keys and keeping the previous key's data (e.g. search results)
// TODO: Support SSR? Support fallback data?
export function useAsyncCache<TData = any, TError = any>(
  cache: AsyncCache<TData, TError>,
  key: string | null
) {
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

  const invalidate = useCallback(() => cacheItem?.invalidate(), [cacheItem]);

  const revalidate = useCallback(() => cacheItem?.revalidate(), [cacheItem]);

  return {
    ...state,
    invalidate,
    revalidate,
  };
}
