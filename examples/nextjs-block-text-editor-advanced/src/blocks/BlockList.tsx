import styles from "./BlockList.module.css";
import { ListElement } from "../types";
import { ReactNode } from "react";

type Props = {
  element: ListElement;
  children: ReactNode;
};

export default function BlockList({ element, children }: Props) {
  return (
    <div className={styles.block_list}>
      <div className={styles.list_bullet} contentEditable={false} />
      <div className={styles.list_text}>
        {children}
      </div>
    </div>
  );
}
