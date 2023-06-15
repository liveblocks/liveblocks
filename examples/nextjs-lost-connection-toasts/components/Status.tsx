import styles from "./Status.module.css";

const statusColours = {
  initial: "gray",
  connecting: "yellow",
  connected: "green",
  reconnecting: "yellow",
  disconnected: "red",
};

const statuses = {
  reconnecting: {
    text: "Reconnecting",
  },
};

export function Status() {
  /*
  const status = useStatus()
   */
  const status = "reconnecting";
  return <div className={styles.status}>{statuses[status].text}</div>;
}
