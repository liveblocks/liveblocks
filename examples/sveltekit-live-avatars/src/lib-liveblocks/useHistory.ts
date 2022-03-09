/**
 * Works similarly to `liveblocks-react` useHistory
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useHistory
 *
 * const history = useHistory()
 * history.pause()
 */
import { useRoom } from "./useRoom";

export function useHistory() {
  return useRoom().history;
}
