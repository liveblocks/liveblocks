// XXX What's different about this example compared to others where we can just do this?
// @ts-expect-error - Cannot find module '../styles/index.module.css' or its corresponding type declarations
import styles from "./Loading.module.css";

export function Loading() {
  return (
    <div className={styles.loading}>
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}
