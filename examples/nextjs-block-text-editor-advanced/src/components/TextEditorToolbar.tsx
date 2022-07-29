import React, { useCallback, useEffect, useState } from "react";
import styles from "../../styles/TextEditorToolbar.module.css";
import { useBatch, useMap, useMyPresence } from "../liveblocks.config";
import Select from "./Select";
import BoldIcon from "../icons/bold.svg";
import ItalicIcon from "../icons/italic.svg";
import UnderlineIcon from "../icons/underline.svg";
import StrikethroughIcon from "../icons/strikethrough.svg";
import classNames from "classnames";
import { BlockTopLevelNode, BlockNodeType } from "../types";
import applyFormatToSelection from "../utils/applyFormatToSelection";
import Button from "./Button";
import Tooltip from "./Tooltip";
import getElementTypeFromBlockTopLevelNode from "../utils/getElementTypeFromBlockTopLevelNode";

type Props = {
  node: BlockTopLevelNode;
  selection: Selection | null;
  position?: { top: number; left: number } | null;
};

export default function TextEditorToolbar({
  position,
  node,
  selection,
}: Props) {
  const [{ selectedBlockIds }] = useMyPresence();
  const blocks = useMap("blocks");
  const batch = useBatch();

  const [selectedTagValue, setSelectedTagValue] = useState<string | undefined>(
    "p"
  );

  useEffect(() => {
    const getSelectedTagValue = () => {
      if (!blocks || !selectedBlockIds.length) {
        setSelectedTagValue("p");
      }

      let value = "p";
      let prevTag;

      for (let i = 0; i < selectedBlockIds.length; i++) {
        const blockId = selectedBlockIds[i];
        const blockNode = blocks?.get(blockId)?.get("node");

        let tag = "p";

        if (!blockNode) {
          break;
        }

        tag = getElementTypeFromBlockTopLevelNode(blockNode);

        if (i === 0) {
          prevTag = tag;
        }
        if (tag === prevTag) {
          value = tag;
        }
      }
      setSelectedTagValue(value);
    };

    getSelectedTagValue();
  }, [blocks, selectedBlockIds]);

  const applyTagToSelectedBlocks = useCallback(
    (value: string) => {
      if (!blocks) {
        return;
      }
      setSelectedTagValue(value);
      batch(() => {
        for (let i = 0; i < selectedBlockIds.length; i++) {
          const id = selectedBlockIds[i];
          const block = blocks.get(id);
          block?.set("node", {
            type: getBlockNodeTypeFromTag(value),
            children: node.children,
          });
        }
      });
    },
    [batch, blocks, selectedBlockIds, node]
  );

  return (
    <div
      className={classNames(styles.toolbar, "toolbar")}
      style={{
        transform: position
          ? `translate3D(${position.left}px, ${position.top}px, 0)`
          : undefined,
      }}
    >
      <div className={styles.tag_selector}>
        <Select
          defaultValue="p"
          value={selectedTagValue}
          disabled={!selectedBlockIds.length}
          items={[
            { label: "Normal text", value: "p" },
            { label: "Heading 1", value: "h1" },
            { label: "Heading 2", value: "h2" },
            { label: "Heading 3", value: "h3" },
          ]}
          onValueChange={(value) => {
            applyTagToSelectedBlocks(value);
          }}
        />
      </div>
      <div className={styles.separator} />
      <div className={styles.group}>
        <Tooltip content="Toggle Bold">
          <Button
            appearance="ghost"
            ariaLabel="Toggle Bold"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              applyFormatToSelection(selection, "bold");
            }}
            isSquare
          >
            <BoldIcon />
          </Button>
        </Tooltip>
        <Tooltip content="Toggle Italic">
          <Button
            appearance="ghost"
            ariaLabel="Toggle Italic"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              applyFormatToSelection(selection, "italic");
            }}
            isSquare
          >
            <ItalicIcon />
          </Button>
        </Tooltip>
        <Tooltip content="Toggle Underline">
          <Button
            appearance="ghost"
            ariaLabel="Toggle Underline"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              applyFormatToSelection(selection, "underline");
            }}
            isSquare
          >
            <UnderlineIcon />
          </Button>
        </Tooltip>
        <Tooltip content="Toggle Strikethrough">
          <Button
            appearance="ghost"
            ariaLabel="Toggle Strikethrough"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              applyFormatToSelection(selection, "strikeThrough");
            }}
            isSquare
          >
            <StrikethroughIcon />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

const getBlockNodeTypeFromTag = (tag: string) => {
  switch (tag) {
    case "h1":
      return BlockNodeType.HeadingOne;
    case "h2":
      return BlockNodeType.HeadingTwo;
    case "h3":
      return BlockNodeType.HeadingThree;
    default:
      return BlockNodeType.Paragraph;
  }
};
