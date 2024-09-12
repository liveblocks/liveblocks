import styles from "./Loading.module.css";

export function Loading() {
  return (
    <div className={styles.loading}>
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}
