import { ComponentProps, ReactNode } from "react";
import styles from "./CircularButton.module.css";

type Props = {
  children: ReactNode;
  appearance: "primary" | "secondary";
} & ComponentProps<"button">;

export function CircularButton(props: Props) {
  return (
    <button
      className={styles.circularButton}
      {...props}
      data-type={props.appearance}
    >
      {props.children}
    </button>
  );
}
