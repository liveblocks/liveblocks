import { LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { useCallback } from "react";
import { MAX_BLOCKS } from "../constants";
import {
  useList,
  useBatch,
  useUpdateMyPresence,
  useMap,
} from "../liveblocks.config";
import { BlockProps } from "../types";
import focusTextBlockById from "../utils/focusTextBlockById";

export default function useInsertBlockByIndex() {
  const blocks = useMap("blocks");
  const blockIds = useList("blockIds");
  const batch = useBatch();
  const setPresence = useUpdateMyPresence();

  return useCallback(
    (block: BlockProps, index: number, shouldSelect: boolean = true) => {
      if (!blocks || !blockIds) {
        return;
      }
      if (blocks.size >= MAX_BLOCKS) {
        return;
      }

      batch(() => {
        const blockId = nanoid();
        blockIds.insert(blockId, index);
        blocks.set(blockId, new LiveObject(block));

        if (shouldSelect) {
          focusTextBlockById(blockId);
          setPresence({ selectedBlockIds: [blockId] }, { addToHistory: true });
        }
      });
    },
    [batch, blockIds, blocks, setPresence]
  );
}
