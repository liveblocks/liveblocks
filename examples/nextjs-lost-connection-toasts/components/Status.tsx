"use client";

import styles from "./Status.module.css";
import { useStatus } from "@/app/liveblocks.config";

const statusColours = {
  initial: "gray",
  connecting: "yellow",
  connected: "green",
  reconnecting: "yellow",
  disconnected: "red",
};

const statuses = {
  connecting: {
    text: "Connecting",
  },
  connected: {
    text: "Connected",
  },
  reconnecting: {
    text: "Reconnecting",
  },
};

export function Status() {
  const status = useStatus();

  return <div className={styles.status}>{statuses[status].text}</div>;
}
