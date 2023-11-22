/**
 * This implementation is inspired by the `swr` library.
 * Additional modifications were made to adapt it to our specific needs.
 *
 * Original `swr` library can be found at [SWR GitHub repository](https://github.com/vercel/swr)
 */

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_ERROR_RETRY_INTERVAL = 5000;
const DEFAULT_MAX_ERROR_RETRY_COUNT = 5;
const DEFAULT_DEDUPING_INTERVAL = 2000;

export type Cache<Data> =
  | {
      isLoading: true;
      data?: never;
      error?: never;
    }
  | {
      isLoading: false;
      data?: Data;
      error?: Error;
    };

export type RequestInfo<Data> = {
  fetcher: Promise<Data>;
  timestamp: number;
};

export type MutationInfo = {
  startTime: number;
  endTime: number;
};

export type CacheManager<Data> = {
  cache: Cache<Data> | undefined; // Stores the current cache state
  request: RequestInfo<Data> | undefined; // Stores the currently active revalidation request
  mutation: MutationInfo | undefined; // Stores the start and end time of the currently active mutation
};

let timestamp = 0;

/**
 * This hook returns a function that can be used to revalidate the cache.
 * @param manager - The cache manager
 * @param fetcher - The function used to fetch the data
 * @param options
 * @returns
 */
export function useRevalidateCache<Data>(
  manager: CacheManager<Data>,
  fetcher: () => Promise<Data>,
  options: {
    dedupingInterval?: number;
    errorRetryInterval?: number;
    errorRetryCount?: number;
  } = {}
) {
  const isOnlineRef = useRef(true); // Stores the current online status of the browser

  const {
    dedupingInterval = DEFAULT_DEDUPING_INTERVAL,
    errorRetryInterval = DEFAULT_ERROR_RETRY_INTERVAL,
    errorRetryCount = DEFAULT_MAX_ERROR_RETRY_COUNT,
  } = options;

  /**
   * Revalidates the cache and optionally dedupes the request.
   * @param shouldDedupe - If true, the request will be deduped
   * @param retryCount - The number of times the request has been retried (used for exponential backoff)
   */
  const _revalidateCache = useCallback(
    async (shouldDedupe: boolean, retryCount: number = 0) => {
      let startAt: number;

      // A new request should be started if there is no ongoing request OR if `shouldDedupe` is false
      const shouldStartRequest = !manager.request || !shouldDedupe;

      function deleteActiveRequest() {
        const activeRequest = manager.request;
        if (!activeRequest) return;
        if (activeRequest.timestamp !== startAt) return;

        manager.request = undefined;
      }

      // Uses the exponential backoff algorithm to retry the request on error.
      function handleError() {
        const timeout =
          ~~((Math.random() + 0.5) * (1 << (retryCount < 8 ? retryCount : 8))) *
          errorRetryInterval;

        if (retryCount > errorRetryCount) return;

        setTimeout(() => {
          void _revalidateCache(false, retryCount + 1);
        }, timeout);
      }

      try {
        if (shouldStartRequest) {
          const currentCache = manager.cache;
          if (!currentCache) manager.cache = { isLoading: true };

          manager.request = {
            fetcher: fetcher(),
            timestamp: ++timestamp,
          };
        }

        const activeRequest = manager.request;
        if (!activeRequest) return;

        startAt = activeRequest.timestamp;

        const newData = await activeRequest.fetcher;

        if (shouldStartRequest) {
          setTimeout(deleteActiveRequest, dedupingInterval);
        }

        // If there was a newer revalidation request (or if the current request was removed due to a mutation), while this request was in flight, we return early and don't update the cache (since the revalidation request is outdated)
        if (!manager.request || manager.request.timestamp !== startAt) return;

        // If there is an active mutation, we ignore the revalidation result as it is outdated (and because the mutation will trigger a revalidation)
        const activeMutation = manager.mutation;
        if (
          activeMutation &&
          (activeMutation.startTime > startAt ||
            activeMutation.endTime > startAt ||
            activeMutation.endTime === 0)
        ) {
          return;
        }

        manager.cache = {
          isLoading: false,
          data: newData,
        };
      } catch (err) {
        deleteActiveRequest();

        // Only retry revalidation if the browser is online and the current document is visible. We auto-revalidate when the browser comes back online.
        const isVisible = document.visibilityState === "visible";
        const isOnline = isOnlineRef.current;

        if (shouldStartRequest && isVisible && isOnline) handleError();

        manager.cache = {
          data: manager.cache?.data,
          isLoading: false,
          error: err as Error,
        };
      }
      return;
    },
    [manager, fetcher, dedupingInterval, errorRetryInterval, errorRetryCount]
  );

  /**
   * Subscribe to online and offline events and update the `isOnlineRef` accordingly. This is used to determine whether or not to retry a request on error.
   * Note: There is a 'navigator.onLine' property that can be used to determine the online status of the browser, but it is not reliable (see https://bugs.chromium.org/p/chromium/issues/detail?id=678075).
   */
  useEffect(() => {
    function handleIsOnline() {
      isOnlineRef.current = true;
    }

    function handleIsOffline() {
      isOnlineRef.current = false;
    }

    window.addEventListener("online", handleIsOnline);
    window.addEventListener("offline", handleIsOffline);
    return () => {
      window.removeEventListener("online", handleIsOnline);
      window.removeEventListener("offline", handleIsOffline);
    };
  }, []);

  const revalidateCache = useCallback(
    (shoulDedupe: boolean) => {
      return _revalidateCache(shoulDedupe, 0);
    },
    [_revalidateCache]
  );

  return revalidateCache;
}

/**
 * This hook returns a function that can be used to mutate the cache with optimistic data. The cache will be reverted to its previous state if the mutation request fails.
 * @param manager - The cache manager
 * @param revalidateCache - The function used to revalidate the cache
 * @returns A function that can be used to mutate the cache with optimistic data
 */
export function useMutate<Data>(
  manager: CacheManager<Data>,
  revalidateCache: (shouldDedupe: boolean) => Promise<void>
) {
  const mutate = useCallback(
    async (
      data: Promise<any>,
      options: {
        optimisticData: Data;
      }
    ) => {
      const beforeMutationTimestamp = ++timestamp;
      manager.mutation = {
        startTime: beforeMutationTimestamp,
        endTime: 0,
      };

      const currentCache = manager.cache;

      // Update the cache with the optimistic data
      manager.cache = {
        isLoading: false,
        data: options.optimisticData,
      };

      try {
        await data;

        // If there was a newer mutation while this mutation was in flight, we return early and don't trigger a revalidation (since the mutation request is outdated)
        const activeMutation = manager.mutation;
        if (
          activeMutation &&
          beforeMutationTimestamp !== activeMutation.startTime
        ) {
          return;
        }
      } catch (err) {
        // If the mutation request fails, revert the optimistic update and throw the error
        manager.cache = currentCache;
        throw err;
      }

      // Mark the mutation as completed by setting the end time to the current timestamp
      manager.mutation = {
        startTime: beforeMutationTimestamp,
        endTime: ++timestamp,
      };

      // Deleting the concurrent request markers so new requests will not be deduped.
      manager.request = undefined;
      void revalidateCache(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ESLint recommends against adding `manager` as a dependency, but not doing so causes the code inside `useEffect` to reference an outdated version of `manager`
    [manager, revalidateCache]
  );

  return mutate;
}

/**
 * This hook automatically revalidates the cache when the browser comes back online, when the document becomes visible, or periodically.
 * @param manager - The cache manager
 * @param revalidateCache - The function used to revalidate the cache
 * @param options.revalidateOnFocus - If true, the cache will be revalidated when the document becomes visible
 * @param options.revalidateOnReconnect - If true, the cache will be revalidated when the browser comes back online
 * @param options.refreshInterval - The interval (in milliseconds) at which the cache should be revalidated
 */
export function useAutomaticRevalidation<Data>(
  manager: CacheManager<Data>,
  revalidateCache: (shouldDedupe: boolean) => Promise<void>,
  options: {
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const isOnlineRef = useRef(true); // Stores the current online status of the browser

  const {
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    refreshInterval = 0,
  } = options;

  /**
   * Periodically revalidate the cache. The revalidation is skipped if the browser is offline or if the document is not visible.
   */
  useEffect(() => {
    let revalidationTimerId: number;

    function scheduleRevalidation() {
      if (refreshInterval === 0) return;

      revalidationTimerId = window.setTimeout(() => {
        const isOnline = isOnlineRef.current;
        const isVisible = document.visibilityState === "visible";

        // Only revalidate if the browser is online AND document is visible AND there are currently no errors, otherwise schedule the next revalidation
        if (isOnline && isVisible && !manager.cache?.error) {
          // Revalidate cache and then schedule the next revalidation
          void revalidateCache(true).then(scheduleRevalidation);
          return;
        }

        scheduleRevalidation();
      }, refreshInterval);
    }

    // Schedule the first revalidation
    scheduleRevalidation();

    return () => {
      window.clearTimeout(revalidationTimerId);
    };
  }, [revalidateCache, refreshInterval, manager]);

  /**
   * Subscribe to online and offline events to trigger a revalidation when the browser comes back online.
   * Note: There is a 'navigator.onLine' property that can be used to determine the online status of the browser, but it is not reliable (see https://bugs.chromium.org/p/chromium/issues/detail?id=678075).
   */
  useEffect(() => {
    function handleIsOnline() {
      isOnlineRef.current = true;
      const isVisible = document.visibilityState === "visible";

      if (revalidateOnReconnect && isVisible) void revalidateCache(true);
    }

    function handleIsOffline() {
      isOnlineRef.current = false;
    }

    window.addEventListener("online", handleIsOnline);
    window.addEventListener("offline", handleIsOffline);
    return () => {
      window.removeEventListener("online", handleIsOnline);
      window.removeEventListener("offline", handleIsOffline);
    };
  }, [revalidateCache, revalidateOnReconnect]);

  /**
   * Subscribe to focus and visibility change events to trigger a revalidation when the document becomes visible.
   */
  useEffect(() => {
    function handleFocusOrVisibilityChange() {
      const isVisible = document.visibilityState === "visible";
      const isOnline = isOnlineRef.current;

      if (revalidateOnFocus && isVisible && isOnline) {
        void revalidateCache(true);
      }
    }

    window.addEventListener("focus", handleFocusOrVisibilityChange);
    document.addEventListener(
      "visibilitychange",
      handleFocusOrVisibilityChange
    );
    return () => {
      window.removeEventListener("focus", handleFocusOrVisibilityChange);
      document.removeEventListener(
        "visibilitychange",
        handleFocusOrVisibilityChange
      );
    };
  }, [revalidateCache, revalidateOnFocus]);
}
