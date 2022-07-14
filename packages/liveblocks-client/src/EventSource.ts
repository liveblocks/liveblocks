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
 *   const [subscribeToEvent1, fireEvent1] = makeEventSource();
 *   const [subscribeToEvent2, fireEvent2] = makeEventSource();
 *
 *   subscribeToEvent1(foo);
 *   subscribeToEvent1(bar);
 *   subscribeToEvent2(qux);
 *
 *   fireEvent1();  // Now foo and bar will get called
 *   fireEvent2();  // Now qux will get called
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
