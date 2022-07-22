import { useCallback } from "react";
import {
  useList,
  useBatch,
  useUpdateMyPresence,
  useMap,
} from "../liveblocks.config";
import focusTextBlockById from "../utils/focusTextBlockById";

export default function useSelectBlockBelow() {
  const blocks = useMap("blocks");
  const blockIds = useList("blockIds");
  const batch = useBatch();
  const setPresence = useUpdateMyPresence();

  return useCallback(
    (blockId: string, caretPosition?: number) => {
      if (!blocks || !blockIds) {
        return;
      }

      const index = blockIds.findIndex((result) => result === blockId);

      if (index === blockIds.length - 1) {
        return;
      }

      const nextId = blockIds.get(index + 1);

      if (!nextId) {
        return;
      }

      batch(() => {
        focusTextBlockById(nextId, caretPosition);
        setPresence({ selectedBlockIds: [nextId] }, { addToHistory: true });
      });
    },
    [batch, blockIds, blocks, setPresence]
  );
}
