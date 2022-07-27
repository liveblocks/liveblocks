import { useCallback } from "react";
import { ID_TITLE_BLOCK } from "../constants";
import {
  useList,
  useBatch,
  useUpdateMyPresence,
  useMap,
} from "../liveblocks.config";
import focusTextBlockById from "../utils/focusTextBlockById";

export default function useSelectBlockAbove() {
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

      if (index === 0) {
        focusTextBlockById(ID_TITLE_BLOCK, caretPosition);
        setPresence({ selectedBlockIds: [] });
        return;
      }

      const previousId = blockIds.get(index - 1);

      if (!previousId) {
        return;
      }

      batch(() => {
        focusTextBlockById(previousId, caretPosition);
        setPresence({ selectedBlockIds: [previousId] });
      });
    },
    [batch, blockIds, blocks, setPresence]
  );
}
