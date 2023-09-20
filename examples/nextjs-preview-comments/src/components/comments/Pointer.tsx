import styles from "./Pointer.module.css";
import { PointerIcon } from "@/components/icons/PointerIcon";

export const POINTER_OFFSET = {
  x: 10,
  y: 12,
};

export function Pointer() {
  return (
    <div className={styles.pointer}>
      <PointerIcon width="14" />
    </div>
  );
}
