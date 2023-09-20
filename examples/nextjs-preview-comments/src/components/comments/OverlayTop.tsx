import { DragHandleIcon } from "@/components/icons/DragHandleIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { PointerEventHandler } from "react";
import styles from "./OverlayTop.module.css";

type Props = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onClose: () => void;
};

export function OverlayTop({ onPointerDown, onClose }: Props) {
  return (
    <div className={styles.overlayThreadTop} onPointerDown={onPointerDown}>
      <div className={styles.overlayDragHandle}>
        <DragHandleIcon />
      </div>
      <button className={styles.overlayMinimizeButton} onClick={onClose}>
        <span className="sr-only">Minimize</span>
        <CloseIcon />
      </button>
    </div>
  );
}
