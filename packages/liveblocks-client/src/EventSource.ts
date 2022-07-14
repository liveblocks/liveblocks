type Callback<T> = (event: T) => void;
type UnsubscribeCallback = () => void;

export type EventSource<T> = {
  subscribe(callback: Callback<T>): UnsubscribeCallback;
};

export type EventEmitter<T> = (event: T) => void;

/**
 * makeEventSource allows you to generate a subscribe/notify pair of functions
 * to make subscribing easy and to get notified about events.
 *
 * The events are anonymous, so you can use it to define events, like so:
 *
 *   const [event1, emitEvent1] = makeEventSource();
 *   const [event2, emitEvent2] = makeEventSource();
 *
 *   event1.subscribe(foo);
 *   event1.subscribe(bar);
 *   event2.subscribe(qux);
 *
 *   // Unsubscription is pretty standard
 *   const unsub = event2.subscribe(foo);
 *   unsub();
 *
 *   emitEvent1();  // Now foo and bar will get called
 *   emitEvent2();  // Now qux will get called (but foo will not, since it's unsubscribed)
 *
 */
export function makeEventSource<T>(): [EventSource<T>, EventEmitter<T>] {
  const _observers = new Set<Callback<T>>();

  function subscribe(callback: Callback<T>): UnsubscribeCallback {
    _observers.add(callback);
    return () => _observers.delete(callback);
  }

  function notify(event: T) {
    _observers.forEach((callback) => callback(event));
  }

  return [{ subscribe }, notify];
}
