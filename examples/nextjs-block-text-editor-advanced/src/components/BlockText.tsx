import styles from "../../styles/BlockText.module.css";
import { BlockType, TextBlock } from "../types";
import classNames from "classnames";
import BlockInlineActions from "./BlockInlineActions";
import { LiveObject } from "@liveblocks/client";
import useDeleteBlocksByIds from "../hooks/useDeleteBlocksByIds";
import useSelectBlockAbove from "../hooks/useSelectBlockAbove";
import useSelectBlockBelow from "../hooks/useSelectBlockBelow";
import { useMyPresence } from "../liveblocks.config";
import useOthersByBlockId from "../hooks/useOthersByBlockId";
import Avatar from "./Avatar";
import TextEditor from "./TextEditor";
import isCaretOnFirstLine from "../utils/isCaretOnFirstLine";
import isCaretOnLastLine from "../utils/isCaretOnLastLine";
import isBlockTopLevelNodeEmpty from "../utils/isBlockTopLevelNodeEmpty";
import UserTextSelection from "./UserTextSelection";
import { MAX_TEXT_BLOCK_LENGTH, USER_COLORS } from "../constants";
import getInnerTextCaretPosition from "../utils/getInnerTextCaretPosition";
import convertHtmlToBlockTopLevelNode from "../utils/convertHtmlToBlockTopLevelNode";
import useBlockAbove from "../hooks/useBlockAbove";
import convertBlockNodeToHtml from "../utils/convertBlockNodeToHtml";
import getInnerTextFromHtml from "../utils/getInnerTextFromHtml";
import useReturnKeyTextBlock from "../hooks/useReturnKeyTextBlock";

type Props = {
  id: string;
  blockId: string;
  block: LiveObject<TextBlock>;
  data: TextBlock;
};

export default function BlockText({ id, blockId, block, data }: Props) {
  const deleteBlocksByIds = useDeleteBlocksByIds();
  const handleReturnKeyTextBlock = useReturnKeyTextBlock();
  const selectBlockAbove = useSelectBlockAbove();
  const selectBlockBelow = useSelectBlockBelow();
  const othersByBlockId = useOthersByBlockId(blockId);
  const blockAbove = useBlockAbove(blockId, BlockType.Text);

  const [{ selectedBlockIds }, setPresence] = useMyPresence();
  const isSelected = !!selectedBlockIds.find((id) => id === blockId);
  const isElementFocused =
    document.getElementById(id) === document.activeElement;

  return (
    <div
      className={classNames(styles.block_text, {
        [styles.block_text_selected]: isElementFocused,
      })}
    >
      <TextEditor
        id={id}
        node={data.node}
        maxLength={MAX_TEXT_BLOCK_LENGTH}
        onChange={(node) => {
          block.set("node", node);
        }}
        onTextSelectionChange={(textSelection) => {
          setPresence({ textSelection });
        }}
        onFocus={() => {
          if (isSelected) {
            return;
          }

          setPresence({ selectedBlockIds: [blockId] });
        }}
        onKeyDown={(e, node) => {
          const selection = window.getSelection();
          const element = e.currentTarget as HTMLElement;
          if (!selection || !element) {
            return;
          }

          const caretPosition = getInnerTextCaretPosition(element, selection);
          const hasTextSelected =
            Math.abs(selection.anchorOffset - selection.focusOffset) > 0;

          if (caretPosition == null) {
            return;
          }

          switch (e.key) {
            case "Backspace":
              if (!blockId || !blockAbove) {
                break;
              }

              if (!isBlockTopLevelNodeEmpty(node) && caretPosition !== 0) {
                break;
              }

              if (hasTextSelected) {
                break;
              }

              const blockAboveData = blockAbove.toObject();

              if (blockAboveData.type !== BlockType.Text) {
                break;
              }

              e.preventDefault();

              const nodeAbove = blockAboveData.node;

              if (caretPosition === 0) {
                blockAbove.set(
                  // @ts-ignore
                  "node",
                  convertHtmlToBlockTopLevelNode(
                    nodeAbove.type,
                    convertBlockNodeToHtml(nodeAbove) + element.innerHTML
                  )
                );
              }

              selectBlockAbove(
                blockId,
                getInnerTextFromHtml(convertBlockNodeToHtml(nodeAbove)).length
              );
              deleteBlocksByIds([blockId]);
              break;

            case "Enter":
              if (e.shiftKey) {
                return;
              }

              e.preventDefault();
              handleReturnKeyTextBlock(block, blockId, element, caretPosition);
              break;

            case "ArrowUp":
              if (isCaretOnFirstLine(e.currentTarget as HTMLElement)) {
                e.preventDefault();
                // TODO: position caret on last line
                selectBlockAbove(blockId);
              }
              break;

            case "ArrowDown":
              if (isCaretOnLastLine(e.currentTarget as HTMLElement)) {
                e.preventDefault();
                selectBlockBelow(blockId);
              }
              break;

            // Making sure this doesn't trigger global undo/redo
            case "z":
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                break;
              }
          }
        }}
      />
      {isElementFocused && isBlockTopLevelNodeEmpty(data.node) && (
        <div className={classNames(styles.placeholder, "placeholder")}>
          Type something here…
        </div>
      )}

      {othersByBlockId.length > 0 && !isElementFocused && (
        <div>
          {othersByBlockId.map((user) => {
            return user.presence?.textSelection ? (
              <UserTextSelection
                node={data.node}
                key={user.connectionId}
                name={user.info.name}
                textSelection={user.presence?.textSelection}
                color={USER_COLORS[user.connectionId % USER_COLORS.length]}
              />
            ) : null;
          })}
        </div>
      )}

      {othersByBlockId.length > 0 && (
        <div className={classNames(styles.avatars, "avatars")}>
          {othersByBlockId.map((user) => {
            return (
              <Avatar
                key={user.connectionId}
                imageUrl={user.info.imageUrl}
                name={user.info.name}
                size="sm"
                color={USER_COLORS[user.connectionId % USER_COLORS.length]}
              />
            );
          })}
        </div>
      )}

      {blockId && (
        <div className={classNames(styles.inline_actions, "inline_actions")}>
          <BlockInlineActions blockId={blockId} />
        </div>
      )}
    </div>
  );
}
