export type Callback<T> = (event: T) => void;
export type UnsubscribeCallback = () => void;

export type Observable<T> = {
  /**
   * Register a callback function to be called whenever the event source emits
   * an event.
   */
  subscribe(callback: Callback<T>): UnsubscribeCallback;
  /**
   * Register a one-time callback function to be called whenever the event
   * source emits an event. After the event fires, the callback is
   * auto-unsubscribed.
   */
  subscribeOnce(callback: Callback<T>): UnsubscribeCallback;
  /**
   * Returns a promise that will resolve when an event is emitted by this
   * event source. Optionally, specify a predicate that has to match. The first
   * event matching that predicate will then resolve the promise.
   */
  waitUntil(predicate?: (event: T) => boolean): Promise<T>;
};

export type EventSource<T> = Observable<T> & {
  /**
   * Notify all subscribers about the event.
   */
  notify(event: T): void;
  /**
   * Clear all registered event listeners. None of the registered functions
   * will ever get called again. Be careful when using this API, because the
   * subscribers may not have any idea they won't be notified anymore.
   */
  clear(): void;
  /**
   * Returns the number of active subscribers.
   */
  count(): number;
  /**
   * Pauses event delivery until unpaused. Any .notify() calls made while
   * paused will get buffered into memory and emitted later.
   */
  pause(): void;
  /**
   * Emits all in-memory buffered events, and unpauses. Any .notify() calls
   * made after this will be synchronously delivered again.
   */
  unpause(): void;
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
  let _buffer: T[] | null = null;

  function pause(): void {
    _buffer = [];
  }

  function unpause(): void {
    if (_buffer === null) {
      // Already unpaused
      return;
    }

    for (const event of _buffer) {
      notify(event);
    }
    _buffer = null;
  }

  function subscribe(callback: Callback<T>): UnsubscribeCallback {
    _observers.add(callback);
    return () => _observers.delete(callback);
  }

  function subscribeOnce(callback: Callback<T>): UnsubscribeCallback {
    _onetimeObservers.add(callback);
    return () => _onetimeObservers.delete(callback);
  }

  async function waitUntil(predicate?: (event: T) => boolean): Promise<T> {
    let unsub: () => void | undefined;
    return new Promise<T>((res) => {
      unsub = subscribe((event) => {
        if (predicate === undefined || predicate(event)) {
          res(event);
        }
      });
    }).finally(() => unsub?.());
  }

  function notifyOrBuffer(event: T) {
    if (_buffer !== null) {
      _buffer.push(event);
    } else {
      notify(event);
    }
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

  function count() {
    return _onetimeObservers.size + _observers.size;
  }

  return {
    // Private/internal control over event emission
    notify: notifyOrBuffer,
    subscribe,
    subscribeOnce,
    clear,
    count,

    waitUntil,
    pause,
    unpause,

    // Publicly exposable subscription API
    observable: {
      subscribe,
      subscribeOnce,
      waitUntil,
    },
  };
}
