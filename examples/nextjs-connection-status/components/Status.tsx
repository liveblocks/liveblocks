"use client";

import styles from "./Status.module.css";
import { useStatus } from "@/liveblocks.config";

export function Status() {
  const status = useStatus();

  console.log("status", status);
  return (
    <div className={styles.status} data-status={status}>
      <div className={styles.statusCircle} />
      <div className={styles.statusText}>{status}</div>
    </div>
  );
}
