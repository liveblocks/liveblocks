import styles from "./Loading.module.css";

export default function Loading() {
  return (
    <div className={styles.loading}>
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}
