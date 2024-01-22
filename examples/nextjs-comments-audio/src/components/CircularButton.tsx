import { ComponentProps, ReactNode } from "react";
import styles from "./CircularButton.module.css";

type Props = {
  children: ReactNode;
} & ComponentProps<"button">;

export function CircularButton(props: Props) {
  return (
    <button className={styles.circularButton} {...props}>
      {props.children}
    </button>
  );
}
