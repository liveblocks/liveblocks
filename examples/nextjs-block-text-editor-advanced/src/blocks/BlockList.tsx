import styles from "./BlockList.module.css";
import { ListElement } from "../types";
import { ReactNode } from "react";

type Props = {
  element: ListElement;
  children: ReactNode;
};

export default function BlockList({ element, children }: Props) {
  return (
    <ul className={styles.block_list}>
      <li className={styles.list_item}>{children}</li>
    </ul>
  );
}
