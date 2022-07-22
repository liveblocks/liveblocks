import styles from "../../styles/BlockInlineActions.module.css";
import useDeleteBlocksByIds from "../hooks/useDeleteBlocksByIds";
import Button from "./Button";
import PlusIcon from "../icons/plus.svg";
import MinusIcon from "../icons/minus.svg";
import DragIcon from "../icons/drag.svg";
import useInsertBlockBelow from "../hooks/useInsertBlockBelow";
import { BlockType } from "../types";
import { useDraggable } from "@dnd-kit/core";
import { BlockNodeType } from "../types";
import Tooltip from "./Tooltip";

type Props = {
  blockId: string;
};

export default function BlockInlineActions({ blockId }: Props) {
  const deleteBlocksByIds = useDeleteBlocksByIds();
  const insertBlockBelow = useInsertBlockBelow();

  const { listeners, setActivatorNodeRef } = useDraggable({
    id: blockId,
  });

  return (
    <div className={styles.inline_actions}>
      <Tooltip content="Delete">
        <Button
          type="ghost"
          onClick={() => {
            deleteBlocksByIds([blockId]);
          }}
          ariaLabel="Delete"
        >
          <MinusIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Insert block below">
        <Button
          type="ghost"
          onClick={() => {
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
          }}
          ariaLabel="Insert block below"
        >
          <PlusIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Drag to reorder">
        <Button
          type="ghost"
          ariaLabel="Drag to reorder"
          ref={setActivatorNodeRef}
          {...listeners}
        >
          <DragIcon />
        </Button>
      </Tooltip>
    </div>
  );
}
