import { useCallback } from "react";
import {
  useList,
  useBatch,
  useUpdateMyPresence,
  useMap,
} from "../liveblocks.config";

export default function useDeleteBlocksByIds() {
  const blocks = useMap("blocks");
  const blockIds = useList("blockIds");
  const batch = useBatch();
  const setPresence = useUpdateMyPresence();

  return useCallback(
    (blockIdsToDelete: string[]) => {
      if (!blocks || !blockIds) {
        return;
      }

      batch(() => {
        for (const id of blockIdsToDelete) {
          // Delete the block from the blocks LiveMap
          blocks.delete(id);
          // Find the block index in the LiveList and remove it
          const index = blockIds.indexOf(id);
          if (index !== -1) {
            blockIds.delete(index);
          }
        }

        setPresence({ selectedBlockIds: [] }, { addToHistory: true });
      });
    },
    [batch, blockIds, blocks, setPresence]
  );
}
