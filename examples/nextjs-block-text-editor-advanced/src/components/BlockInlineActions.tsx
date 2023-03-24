import styles from "./BlockInlineActions.module.css";
import Button from "./Button";
import PlusIcon from "../icons/plus.svg";
import MinusIcon from "../icons/minus.svg";
import DragIcon from "../icons/drag.svg";
import { useDraggable } from "@dnd-kit/core";
import Tooltip from "./Tooltip";
import BlockTypeSelector from "./BlockTypeSelector";
import { CustomElement } from "../types";

type Props = {
  blockId: string;
  onDelete: () => void;
  onInsertBelow: (block: CustomElement) => void;
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
      <BlockTypeSelector onSelect={onInsertBelow}>
        <Button appearance="ghost" ariaLabel="Insert block below" isSquare>
          <PlusIcon />
        </Button>
      </BlockTypeSelector>
      <Tooltip content="Drag to reorder">
        <Button
          appearance="ghost"
          ariaLabel="Drag to reorder"
          ref={setActivatorNodeRef}
          {...listeners}
          isSquare
          className={styles.button_drag}
        >
          <DragIcon />
        </Button>
      </Tooltip>
    </div>
  );
}
