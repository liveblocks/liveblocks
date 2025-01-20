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
   * Notify all subscribers about the event. Will return `false` if there
   * weren't any subscribers at the time the .notify() was called, or `true` if
   * there was at least one subscriber.
   */
  notify(event: T): boolean;
  /**
   * Returns the number of active subscribers.
   */
  count(): number;
  /**
   * Observable instance, which can be used to subscribe to this event source
   * in a readonly fashion. Safe to publicly expose.
   */
  observable: Observable<T>;
  /**
   * Disposes of this event source.
   *
   * Will clears all registered event listeners. None of the registered
   * functions will ever get called again.
   *
   * WARNING!
   * Be careful when using this API, because the subscribers may not have any
   * idea they won't be notified anymore.
   */
  [Symbol.dispose](): void;
};

export type BufferableEventSource<T> = EventSource<T> & {
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
  const _observers = new Set<Callback<T>>();

  function subscribe(callback: Callback<T>): UnsubscribeCallback {
    _observers.add(callback);
    return () => _observers.delete(callback);
  }

  function subscribeOnce(callback: Callback<T>): UnsubscribeCallback {
    const unsub = subscribe((event: T) => {
      unsub();
      return callback(event);
    });
    return unsub;
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

  function notify(event: T) {
    let called = false;
    for (const callback of _observers) {
      callback(event);
      called = true;
    }
    return called;
  }

  function count() {
    return _observers.size;
  }

  return {
    // Private/internal control over event emission
    notify,
    subscribe,
    subscribeOnce,
    count,

    waitUntil,

    [Symbol.dispose]: (): void => {
      _observers.clear();
    },

    // Publicly exposable subscription API
    observable: {
      subscribe,
      subscribeOnce,
      waitUntil,
    },
  };
}

export function makeBufferableEventSource<T>(): BufferableEventSource<T> {
  const eventSource = makeEventSource<T>();
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
      eventSource.notify(event);
    }
    _buffer = null;
  }

  function notifyOrBuffer(event: T) {
    if (_buffer !== null) {
      _buffer.push(event);
      return false;
    } else {
      return eventSource.notify(event);
    }
  }

  return {
    ...eventSource,
    notify: notifyOrBuffer,
    pause,
    unpause,

    [Symbol.dispose]: (): void => {
      eventSource[Symbol.dispose]();
      if (_buffer !== null) {
        _buffer.length = 0;
      }
    },
  };
}
