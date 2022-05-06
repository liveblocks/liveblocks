import { useRoom } from "./useRoom";

/**
 * Works similarly to `liveblocks-react` useBatch
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useBatch
 *
 * const batch = useBatch()
 * batch(() => {
 *   // ...
 * })
 */
export function useBatch() {
  return useRoom().batch;
}
