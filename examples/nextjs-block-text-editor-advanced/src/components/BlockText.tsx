import styles from "../../styles/BlockText.module.css";
import { BlockType, TextBlock } from "../types";
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
import { BlockNodeType } from "../types";
import isCaretOnFirstLine from "../utils/isCaretOnFirstLine";
import isCaretOnLastLine from "../utils/isCaretOnLastLine";
import { useState } from "react";
import isBlockTopLevelNodeEmpty from "../utils/isBlockTopLevelNodeEmpty";
import UserTextSelection from "./UserTextSelection";
import { USER_COLORS } from "../constants";
import getInnerTextCaretPosition from "../utils/getInnerTextCaretPosition";
import useInsertBlockAbove from "../hooks/useInsertBlockAbove";
import getHtmlIndexPositionFromInnerTextPosition from "../utils/getHtmlIndexPositionFromInnerTextPosition";
import convertHtmlToBlockTopLevelNode from "../utils/convertHtmlToBlockTopLevelNode";
import useBlockAbove from "../hooks/useBlockAbove";
import convertBlockNodeToHtml from "../utils/convertBlockNodeToHtml";
import getInnerTextFromHtml from "../utils/getInnerTextFromHtml";

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
  const insertBlockBelow = useInsertBlockBelow();
  const insertBlockAbove = useInsertBlockAbove();
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

          if (caretPosition == null) {
            return;
          }

          const htmlCaretPosition = getHtmlIndexPositionFromInnerTextPosition(
            caretPosition,
            element.innerHTML
          );

          switch (e.key) {
            case "Backspace":
              if (!blockId) {
                break;
              }

              if (isBlockTopLevelNodeEmpty(node)) {
                e.preventDefault();
                selectBlockAbove(blockId);
                deleteBlocksByIds([blockId]);
                break;
              }

              if (blockAbove && caretPosition === 0) {
                const nodeAbove = blockAbove.get("node");
                const nodeAboveHtml = convertBlockNodeToHtml(nodeAbove);
                blockAbove.set(
                  "node",
                  convertHtmlToBlockTopLevelNode(
                    nodeAbove.type,
                    nodeAboveHtml + element.innerHTML
                  )
                );
                selectBlockAbove(
                  blockId,
                  getInnerTextFromHtml(nodeAboveHtml).length
                );
                deleteBlocksByIds([blockId]);
              }
              break;

            case "Enter":
              e.preventDefault();

              if (caretPosition === 0) {
                insertBlockAbove(
                  {
                    type: BlockType.Text,
                    node: {
                      type: BlockNodeType.Paragraph,
                      children: [
                        {
                          type: BlockNodeType.Text,
                          text: "",
                        },
                      ],
                    },
                  },
                  blockId,
                  false
                );
                break;
              }

              if (caretPosition === element.innerText.length) {
                insertBlockBelow(
                  {
                    type: BlockType.Text,
                    node: {
                      type: BlockNodeType.Paragraph,
                      children: [
                        {
                          type: BlockNodeType.Text,
                          text: "",
                        },
                      ],
                    },
                  },
                  blockId
                );
                break;
              }

              block.set(
                "node",
                convertHtmlToBlockTopLevelNode(
                  node.type,
                  element.innerHTML.substring(0, htmlCaretPosition)
                )
              );

              insertBlockBelow(
                {
                  type: BlockType.Text,
                  node: {
                    type: BlockNodeType.Paragraph,
                    children: [
                      {
                        type: BlockNodeType.Text,
                        text: element.innerHTML.substring(
                          htmlCaretPosition,
                          element.innerHTML.length
                        ),
                      },
                    ],
                  },
                },
                blockId
              );
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
