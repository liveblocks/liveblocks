import { makeEventSource } from "@liveblocks/core";

import type {
  Cache,
  CacheManager,
  MutationInfo,
  RequestInfo,
} from "./revalidation";

export default function createCacheManager<Data>(): CacheManager<Data> & {
  subscribe: (callback: (state: Cache<Data> | undefined) => void) => () => void;
} {
  let cache: Cache<Data> | undefined; // Stores the current cache state
  let request: RequestInfo<Data> | undefined; // Stores the currently active revalidation request
  let mutation: MutationInfo | undefined; // Stores the start and end time of the currently active mutation

  const eventSource = makeEventSource<Cache<Data> | undefined>();

  return {
    get cache() {
      return cache;
    },

    set cache(value: Cache<Data> | undefined) {
      cache = value;
      eventSource.notify(cache);
    },

    get request() {
      return request;
    },

    set request(value: RequestInfo<Data> | undefined) {
      request = value;
    },

    get mutation() {
      return mutation;
    },

    set mutation(value: MutationInfo | undefined) {
      mutation = value;
    },

    subscribe(callback: (state: Cache<Data> | undefined) => void) {
      return eventSource.subscribe(callback);
    },
  };
}
