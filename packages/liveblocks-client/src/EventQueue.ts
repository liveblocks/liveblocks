type Callback<T> = (event: T) => void;
type UnsubscribeCallback = () => void;

/**
 * makeEventPair allows you to generate a subscribe/notify pair of functions to
 * make subscribing easy and to get notified about events.
 *
 * The events are anonymous, so you can use it to define events, like so:
 *
 *   const [subscribeToEvent1, fireEvent1] = makeEventPair();
 *   const [subscribeToEvent2, fireEvent2] = makeEventPair();
 *
 *   subscribeToEvent1(foo);
 *   subscribeToEvent1(bar);
 *   subscribeToEvent2(qux);
 *
 *   fireEvent1();  // Now foo and bar will get called
 *   fireEvent2();  // Now qux will get called
 *
 */
export function makeEventPair<T>(): [
  (callback: Callback<T>) => UnsubscribeCallback,
  (event: T) => void
] {
  const _observers = new Set<Callback<T>>();

  function subscribe(callback: Callback<T>): UnsubscribeCallback {
    _observers.add(callback);
    return () => _observers.delete(callback);
  }

  function notify(event: T) {
    _observers.forEach((callback) => callback(event));
  }

  return [subscribe, notify];
}
