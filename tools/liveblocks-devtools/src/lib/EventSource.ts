export type Callback<T> = (event: T) => void;
export type UnsubscribeCallback = () => void;

export type Observable<T> = {
  subscribe(callback: Callback<T>): UnsubscribeCallback;
  subscribeOnce(callback: Callback<T>): UnsubscribeCallback;
};

export type EventSource<T> = {
  /**
   * Private/controlled notification of events.
   */
  notify(event: T): void;
  subscribe(callback: Callback<T>): UnsubscribeCallback;
  subscribeOnce(callback: Callback<T>): UnsubscribeCallback;
  clear(): void;

  /**
   * Observable instance, which can be used to subscribe to this event source
   * in a readonly fashion. Safe to publicly expose.
   */
  observable: Observable<T>;
};

export type EventEmitter<T> = (event: T) => void;

/**
 * makeEventSource allows you to generate a subscribe/notify pair of functions
 * to make subscribing easy and to get notified about events.
 *
 * The events are anonymous, so you can use it to define events, like so:
 *
 *   const event1 = makeEventSource();
 *   const event2 = makeEventSource();
 *
 *   event1.subscribe(foo);
 *   event1.subscribe(bar);
 *   event2.subscribe(qux);
 *
 *   // Unsubscription is pretty standard
 *   const unsub = event2.subscribe(foo);
 *   unsub();
 *
 *   event1.notify();  // Now foo and bar will get called
 *   event2.notify();  // Now qux will get called (but foo will not, since it's unsubscribed)
 *
 */
export function makeEventSource<T>(): EventSource<T> {
  const _onetimeObservers = new Set<Callback<T>>();
  const _observers = new Set<Callback<T>>();

  function subscribe(callback: Callback<T>): UnsubscribeCallback {
    _observers.add(callback);
    return () => _observers.delete(callback);
  }

  function subscribeOnce(callback: Callback<T>): UnsubscribeCallback {
    _onetimeObservers.add(callback);
    return () => _onetimeObservers.delete(callback);
  }

  function notify(event: T) {
    _onetimeObservers.forEach((callback) => callback(event));
    _onetimeObservers.clear();

    _observers.forEach((callback) => callback(event));
  }

  function clear() {
    _onetimeObservers.clear();
    _observers.clear();
  }

  return {
    // Private/internal control over event emission
    notify,
    subscribe,
    subscribeOnce,
    clear,

    // Publicly exposable subscription API
    observable: {
      subscribe,
      subscribeOnce,
    },
  };
}
