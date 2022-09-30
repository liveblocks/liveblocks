type Callback<T> = (payload: T) => void;

export default () => {
  class EventSource<T> {
    listeners = new Set<Callback<T>>();

    subscribe(callback: Callback<T>) {
      this.listeners.add(callback);
      return () => {
        this.listeners.delete(callback);
      };
    }

    notify(value: T) {
      for (const listener of this.listeners) {
        listener(value);
      }
    }
  }

  (window as any).__LIVEBLOCKS_DEVTOOLS_HOOK__ = {
    init: new EventSource<void>(),
    shout: new EventSource<string>(),
    cheer: new EventSource<string>(),
  };
};
