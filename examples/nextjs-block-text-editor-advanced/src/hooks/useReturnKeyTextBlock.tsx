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
import {
  BlockProps,
  BlockType,
  BlockNodeType,
  TextBlock,
  BlockTopLevelNode,
} from "../types";
import blurTextBlockById from "../utils/blurTextBlockById";
import convertHtmlToBlockTopLevelNode from "../utils/convertHtmlToBlockTopLevelNode";
import focusTextBlockById from "../utils/focusTextBlockById";
import getHtmlIndexPositionFromInnerTextPosition from "../utils/getHtmlIndexPositionFromInnerTextPosition";

export default function useReturnKeyTextBlock() {
  const blocks = useMap("blocks");
  const blockIds = useList("blockIds");
  const batch = useBatch();
  const setPresence = useUpdateMyPresence();

  return useCallback(
    (
      currentBlock: LiveObject<BlockProps>,
      blockId: string,
      element: HTMLElement,
      caretPosition: number
    ) => {
      if (!blocks || !blockIds) {
        return;
      }
      if (blocks.size >= MAX_BLOCKS) {
        return;
      }

      const index = blockIds.findIndex((result) => result === blockId);
      let newBlock: TextBlock | null = null;
      let newCurrentBlockNode: BlockTopLevelNode | null = null;

      switch (caretPosition) {
        case element.innerText.length:
          newBlock = {
            type: BlockType.Text,
            node: convertHtmlToBlockTopLevelNode(BlockNodeType.Paragraph, ""),
          };
          break;

        default:
          const htmlCaretPosition = getHtmlIndexPositionFromInnerTextPosition(
            caretPosition,
            element.innerHTML
          );

          newCurrentBlockNode = convertHtmlToBlockTopLevelNode(
            currentBlock.get("node").type,
            element.innerHTML.substring(0, htmlCaretPosition)
          );

          newBlock = {
            type: BlockType.Text,
            node: convertHtmlToBlockTopLevelNode(
              BlockNodeType.Paragraph,
              element.innerHTML.substring(
                htmlCaretPosition,
                element.innerHTML.length
              )
            ),
          };
          break;
      }

      batch(() => {
        if (!newBlock) {
          return;
        }

        if (newCurrentBlockNode) {
          currentBlock.set("node", newCurrentBlockNode);
          blurTextBlockById(blockId);
        }

        const newBlockId = nanoid();
        blockIds.insert(newBlockId, index + 1);
        blocks.set(newBlockId, new LiveObject(newBlock));

        focusTextBlockById(newBlockId);
        setPresence({ selectedBlockIds: [blockId] }, { addToHistory: true });
      });
    },
    [batch, blockIds, blocks, setPresence]
  );
}
