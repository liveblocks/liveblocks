import styles from "../../styles/BlockText.module.css";
import { BlockTopLevelNode, TextBlock } from "../types";
import classNames from "classnames";
import BlockInlineActions from "./BlockInlineActions";
import { LiveObject } from "@liveblocks/client";
import useDeleteBlocksByIds from "../hooks/useDeleteBlocksByIds";
import useInsertBlockBelow from "../hooks/useInsertBlockBelow";
import useSelectBlockAbove from "../hooks/useSelectBlockAbove";
import useSelectBlockBelow from "../hooks/useSelectBlockBelow";
import { useMyPresence } from "../liveblocks.config";
import useOthersByBlockId from "../hooks/useOthersByBlockId";
import Avatar from "./Avatar";
import TextEditor from "./TextEditor";
import isCaretOnFirstLine from "../utils/isCaretOnFirstLine";
import isCaretOnLastLine from "../utils/isCaretOnLastLine";
import { useState } from "react";
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
  placeholder?: string;
};

export default function BlockText({
  id,
  blockId,
  block,
  data,
  placeholder,
}: Props) {
  const deleteBlocksByIds = useDeleteBlocksByIds();
  const handleReturnKeyTextBlock = useReturnKeyTextBlock();
  const selectBlockAbove = useSelectBlockAbove();
  const selectBlockBelow = useSelectBlockBelow();
  const othersByBlockId = useOthersByBlockId(blockId);
  const blockAbove = useBlockAbove(blockId);

  const [{ selectedBlockIds }, setPresence] = useMyPresence();
  const isSelected = selectedBlockIds.find((id) => id === blockId)
    ? true
    : false;
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={classNames(styles.block_text, {
        [styles.block_text_selected]: isSelected,
      })}
    >
      {placeholder && isFocused && isBlockTopLevelNodeEmpty(data.node) && (
        <div className={classNames(styles.placeholder, "placeholder")}>
          {placeholder}
        </div>
      )}

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
        onFocus={(e) => {
          setIsFocused(true);

          if (isSelected) {
            return;
          }

          setPresence({ selectedBlockIds: [blockId] }, { addToHistory: true });
        }}
        onBlur={() => {
          setIsFocused(false);
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

              e.preventDefault();

              const nodeAbove = blockAbove.get("node");

              if (caretPosition === 0) {
                blockAbove.set(
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
                e.stopPropagation();
                break;
              }
          }
        }}
      />

      {othersByBlockId.length > 0 && !isSelected && (
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
