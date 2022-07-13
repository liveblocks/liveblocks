import React from "react";
import styles from "./Selection.module.css";

type Props = {
  name?: string;
  color?: string;
};

export default function Selection({ name, color }: Props) {
  return (
    <div className={styles.selection}>
      <div
        className={styles.selection_border}
        style={{
          borderColor: color,
        }}
      />
      <div className={styles.selection_name} style={{ background: color }}>
        {name}
      </div>
    </div>
  );
}
