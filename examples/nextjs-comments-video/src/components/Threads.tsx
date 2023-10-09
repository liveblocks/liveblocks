"use client";

import { useThreads } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import { useEffect, useState } from "react";
import styles from "./Threads.module.css";
import { useHighlightThreadListener, useSkipTo } from "@/utils";

export function Threads() {
  return (
    <ClientSideSuspense fallback={null}>
      {() => <ThreadList />}
    </ClientSideSuspense>
  );
}

// TODO separate threads with a gap
function ThreadList() {
  const { threads } = useThreads();
  const [highlightedId, setHighlightedId] = useState("");

  // TODO skip to time when click `0:05`: skipTo(thread.metadata.timePercentage)
  const skipTo = useSkipTo();

  useHighlightThreadListener((threadId) => {
    setHighlightedId("");
    setTimeout(() => setHighlightedId(threadId));
  });

  if (threads.length === 0) {
    return <div>No comments yet!</div>;
  }

  return (
    <div>
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          className={styles.thread}
          thread={thread}
          data-highlight={thread.id === highlightedId || undefined}
        />
      ))}
    </div>
  );
}
