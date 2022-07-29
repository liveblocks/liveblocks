import React from "react";
import styles from "../../styles/Container.module.css";

export default function Container({ children }: { children: React.ReactNode }) {
  return <div className={styles.container}>{children}</div>;
}
