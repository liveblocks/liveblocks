import styles from "./Connected.module.css";

export default function Connected({ connected }: { connected: boolean }) {
  if (connected) {
    return <div className={styles.connected}>Connected</div>;
  }

  return <div className={styles.notConnected}>Not connected</div>;
}
