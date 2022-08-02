import styles from "../../styles/BlockInlineActions.module.css";
import Button from "../components/Button";
import PlusIcon from "../icons/plus.svg";
import MinusIcon from "../icons/minus.svg";
import DragIcon from "../icons/drag.svg";
import { useDraggable } from "@dnd-kit/core";
import Tooltip from "../components/Tooltip";
import BlockTypeSelector from "./BlockTypeSelector";

type Props = {
  blockId: string;
  onDelete: () => void;
  onInsertBelow: () => void;
};

export default function BlockInlineActions({
  blockId,
  onDelete,
  onInsertBelow,
}: Props) {
  const { listeners, setActivatorNodeRef } = useDraggable({
    id: blockId,
  });

  return (
    <div className={styles.inline_actions}>
      <Tooltip content="Delete">
        <Button
          appearance="ghost"
          onClick={onDelete}
          ariaLabel="Delete"
          isSquare
        >
          <MinusIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Insert block below">
        <BlockTypeSelector setBlock={onInsertBelow}>
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
