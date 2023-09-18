import type { UnsubscribeCallback } from "@liveblocks/core";
import { makeEventSource } from "@liveblocks/core";

/**
 * Create a store that keep a state and let consumers subscribe to updates
 * The store assume that the provided state is immutable
 */
export function createStore<T>(initialState: T) {
  let state = initialState;
  const eventSource = makeEventSource<T>();

  return {
    get(): T {
      return state;
    },
    set(newState: T) {
      state = newState;
      eventSource.notify(state);
    },
    subscribe(callback: (state: T) => void): UnsubscribeCallback {
      return eventSource.subscribe(callback);
    },
    subscribeOnce(callback: (state: T) => void): UnsubscribeCallback {
      return eventSource.subscribeOnce(callback);
    },
    subscribersCount() {
      return eventSource.count();
    },
    destroy() {
      return eventSource.clear();
    },
  };
}
