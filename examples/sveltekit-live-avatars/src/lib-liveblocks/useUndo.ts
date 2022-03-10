/**
 * Works similarly to `liveblocks-react` useUndo
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useUndo
 *
 * const undo = useUndo()
 * undo()
 */
import { useRoom } from "./useRoom";

export function useUndo() {
  return useRoom().history.undo;
}
