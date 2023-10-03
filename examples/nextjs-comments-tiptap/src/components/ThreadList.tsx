"use client";

import { useThreads } from "@/liveblocks.config";
import { Thread } from "@liveblocks/react-comments";
import { ErrorBoundary } from "react-error-boundary";
import { ThreadData } from "@liveblocks/client";
import styles from "./ThreadList.module.css";

export function ThreadList() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => {
        console.log(error);

        return (
          <div role="alert">
            <p>Something went wrong:</p>
            <pre style={{ color: "red" }}>{error.message}</pre>
          </div>
        );
      }}
    >
      <ThreadListComponent />
    </ErrorBoundary>
  );
}

function ThreadListComponent() {
  const { threads } = useThreads();

  return (
    <aside aria-label="Comments" className={styles.threadList}>
      {threads.sort(sort as any).map((thread) => (
        <Thread key={thread.id} thread={thread} />
      ))}
    </aside>
  );
}

function sort(a: ThreadData, b: ThreadData) {
  if (a.createdAt > b.createdAt) {
    return -1;
  }

  if (a.createdAt < b.createdAt) {
    return 1;
  }

  return 0;
}

// export const ThreadList = memo(ThreadListComponent);
