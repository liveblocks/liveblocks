import { LiveObject } from "@liveblocks/client";
import { useCallback } from "react";
import { ID_TITLE_BLOCK } from "../constants";
import {
  useList,
  useBatch,
  useUpdateMyPresence,
  useMap,
} from "../liveblocks.config";
import { BlockProps } from "../types";
import focusTextBlockById from "../utils/focusTextBlockById";

export default function useBlockAbove(
  blockId: string
): LiveObject<BlockProps> | null {
  const blocks = useMap("blocks");
  const blockIds = useList("blockIds");

  if (!blocks || !blockIds) {
    return null;
  }

  const index = blockIds.findIndex((result) => result === blockId);

  const previousId = blockIds.get(index - 1);

  if (!previousId) {
    return null;
  }

  return blocks.get(previousId) || null;
}
