import { useReducer, useRef } from "react";

/**
 * Trigger a re-render programmatically, without changing the component's
 * state.
 *
 * Usage:
 *
 *   const rerender = useRerender();
 *   return (
 *     <button onClick={rerender}>
 *       {Math.random()}
 *     </button>
 *   )
 *
 */
export function useRerender(): () => void {
  const [, update] = useReducer(
    // This implementation works by incrementing a hidden counter value that is
    // never consumed. Simply incrementing the counter changes the component's
    // state and, thus, trigger a re-render.
    (x: number): number => x + 1,
    0
  );
  return update;
}

/**
 * "Freezes" a given value, so that it will return the same value/instance on
 * each subsequent render. This can be used to freeze "initial" values for
 * custom hooks, much like how `useState(initialState)` or
 * `useRef(initialValue)` works.
 */
export function useInitial<T>(value: T): T {
  return useRef(value).current;
}

/**
 * Wraps the given value in a mutable ref, so it can be passed into
 * a useEffect deps array, without triggering a rerun every time the
 * value changes.
 *
 * This would be the same as not-including it in the dependency array, except
 * that that might look like a bug. This does an explicit opt-out.
 *
 * When used in the useEffect() hook though, the value `box.current` will
 * always contain the latest version we received through props.
 */
export function useBox<T>(value: T) {
  const box = useRef(value);
  box.current = value;
  return box;
}
