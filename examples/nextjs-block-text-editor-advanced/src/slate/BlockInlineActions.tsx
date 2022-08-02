import styles from "../../styles/BlockInlineActions.module.css";
import Button from "../components/Button";
import PlusIcon from "../icons/plus.svg";
import MinusIcon from "../icons/minus.svg";
import DragIcon from "../icons/drag.svg";
import { useDraggable } from "@dnd-kit/core";
import Tooltip from "../components/Tooltip";

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
        <Button type="ghost" onClick={onDelete} ariaLabel="Delete">
          <MinusIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Insert block below">
        <Button
          type="ghost"
          onClick={onInsertBelow}
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
