/**
 * A Store is just a mini Zustand store.
 */
export type Store<T> = {
  get: () => Readonly<T>;
  set: (callback: (currentState: Readonly<T>) => Readonly<T>) => void;
  subscribe: (callback: (state: Readonly<T>) => void) => () => void;
  batch: (callback: () => void) => void;
};

/**
 * Create a store for an immutable state. Close to Zustand's vanilla store conceptually but with less features.
 */
export function createStore<T>(initialState: T): Store<T> {
  let notifyImmediately = true;
  let dirty = false;
  let state = initialState;
  const subscribers = new Set<(state: T) => void>();

  /**
   * Return the current state.
   */
  function get() {
    return state;
  }

  /**
   * Update the current state and notify all the subscribers of the update.
   */
  function set(callback: (currentState: T) => T) {
    const oldState = state;
    const newState = callback(oldState);

    if (newState !== oldState) {
      state = newState;
      dirty = true;
    }

    if (notifyImmediately) {
      notify();
    }
  }

  function notify() {
    if (!dirty) {
      return;
    }

    dirty = false;
    for (const subscriber of subscribers) {
      subscriber(state);
    }
  }

  /**
   * While the callback is running, do not notify any subscribers. Keep
   * collecting (potentially multiple) .set() updates to the store, and only
   * notify subscribers at the end of the callback.
   */
  function batch(cb: () => void): void {
    if (notifyImmediately === false) {
      // Already in a batch, make this inner batch a no-op
      return cb();
    }

    notifyImmediately = false;
    try {
      cb();
    } finally {
      notifyImmediately = true;
      notify();
    }
  }

  /**
   * Subscribe to any store updates.
   *
   * @returns A function to unsubscribe
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
    batch,
    subscribe,
  };
}
