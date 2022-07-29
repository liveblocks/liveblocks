import styles from "../../styles/BlockInlineActions.module.css";
import useDeleteBlocksByIds from "../hooks/useDeleteBlocksByIds";
import Button from "./Button";
import PlusIcon from "../icons/plus.svg";
import MinusIcon from "../icons/minus.svg";
import DragIcon from "../icons/drag.svg";
import useInsertBlockBelow from "../hooks/useInsertBlockBelow";
import { useDraggable } from "@dnd-kit/core";
import Tooltip from "./Tooltip";
import BlockTypeSelector from "./BlockTypeSelector";

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
          appearance="ghost"
          onClick={() => {
            deleteBlocksByIds([blockId]);
          }}
          ariaLabel="Delete"
          isSquare
        >
          <MinusIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Insert block below">
        <BlockTypeSelector
          setBlock={(block) => {
            insertBlockBelow(block, blockId);
          }}
        >
          <Button appearance="ghost" ariaLabel="Insert block below" isSquare>
            <PlusIcon />
          </Button>
        </BlockTypeSelector>
      </Tooltip>
      <Tooltip content="Drag to reorder">
        <Button
          appearance="ghost"
          ariaLabel="Drag to reorder"
          ref={setActivatorNodeRef}
          {...listeners}
          isSquare
        >
          <DragIcon />
        </Button>
      </Tooltip>
    </div>
  );
}
