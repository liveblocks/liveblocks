"use client";

import styles from "./Status.module.css";
import { useStatus } from "@liveblocks/react/suspense";

export function Status() {
  const status = useStatus();

  return (
    <div className={styles.status} data-status={status}>
      <div className={styles.statusCircle} />
      <div className={styles.statusText}>{status}</div>
    </div>
  );
}
