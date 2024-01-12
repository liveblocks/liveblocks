export type Store<T> = {
  get: () => T;
  set: (callback: (currentState: T) => T) => void;
  subscribe: (callback: (state: T) => void) => () => void;
};

/**
 * Create a store for an immutable state. Close to Zustand vanilla store conceptually but with less features
 */
export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const subscribers = new Set<(state: T) => void>();

  /**
   * Return the current state
   */
  function get() {
    return state;
  }

  /**
   * Update the current state and notify all the subscribers of the update
   */
  function set(callback: (currentState: T) => T) {
    state = callback(state);

    for (const subscriber of subscribers) {
      subscriber(state);
    }
  }

  /**
   * Subscribe to any store updates
   * @returns Unsubscribe function
   */
  function subscribe(callback: (state: T) => void): () => void {
    subscribers.add(callback);

    callback(state);

    return () => {
      subscribers.delete(callback);
    };
  }

  return {
    get,
    set,
    subscribe,
  };
}
