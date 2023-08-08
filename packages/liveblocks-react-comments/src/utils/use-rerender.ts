import { useReducer } from "react";

/**
 * Trigger a re-render programmatically, without changing the component's
 * state.
 *
 * @example
 * const rerender = useRerender();
 *
 * return (
 *   <button onClick={rerender}>
 *     {Math.random()}
 *   </button>
 * )
 */
export function useRerender(): [() => void, number] {
  const [key, update] = useReducer(
    // This implementation works by incrementing a hidden counter value that is
    // never consumed. Simply incrementing the counter changes the component's
    // state and, thus, trigger a re-render.
    (key: number): number => key + 1,
    0
  );
  return [update, key];
}
