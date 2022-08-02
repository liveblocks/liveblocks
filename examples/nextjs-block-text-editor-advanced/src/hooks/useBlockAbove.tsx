import { LiveObject } from "@liveblocks/client";
import { useList, useMap } from "../liveblocks.config";
import { BlockType, BlockProps } from "../types";

export default function useBlockAbove(
  blockId: string,
  type?: BlockType
): LiveObject<BlockProps> | null {
  const blocks = useMap("blocks");
  const blockIds = useList("blockIds");

  if (!blocks || !blockIds) {
    return null;
  }

  const index = blockIds.findIndex((result) => result === blockId);

  for (let i = index - 1; i >= 0; i--) {
    const previousId = blockIds.get(i);

    if (!previousId) {
      break;
    }

    const block = blocks.get(previousId);

    if (!block) {
      break;
    }

    if (type && block.get("type") === type) {
      return block;
    }
  }

  return null;
}
