import * as RadixSwitch from "@radix-ui/react-switch";
import * as React from "react";
import styles from "./Switch.module.css";

interface Props extends RadixSwitch.SwitchProps {
  label: string;
  id: string;
  justifyBetween?: boolean;
}

export function Switch({ justifyBetween, ...props }: Props) {
  return (
    <div
      className={styles.switch}
      style={{
        justifyContent: justifyBetween ? "space-between" : undefined,
      }}
    >
      <label className={styles.label} htmlFor={props.id}>
        {props.label}
      </label>
      <RadixSwitch.Root className={styles.root} {...props}>
        <RadixSwitch.Thumb className={styles.thumb} />
      </RadixSwitch.Root>
    </div>
  );
}
