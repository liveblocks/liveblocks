"use client";

import { ThreadMetadata, useThreads } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import { useCallback, useRef, useState } from "react";
import styles from "./Threads.module.css";
import { useSkipTo } from "@/utils";
import { ThreadData } from "@liveblocks/core";
import { formatTime } from "@/components/Duration";
import { TimeIcon } from "@/icons/Time";

export function Threads() {
  return (
    <ClientSideSuspense fallback={null}>
      {() => <ThreadList />}
    </ClientSideSuspense>
  );
}

function ThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return <div className={styles.emptyState}>No comments yet!</div>;
  }

  return (
    <>
      {threads.sort(sortThreads).map((thread) => (
        <CustomThread key={thread.id} thread={thread} />
      ))}
    </>
  );
}

function CustomThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
  const ref = useRef<HTMLDivElement>(null);
  const threadHasTime = thread.metadata.timePercentage !== -1;
  const skipTo = useSkipTo();
  const [highlightedThread, setHighlightedThread] = useState(false);

  // Skip to metadata time
  const handleButtonClick = useCallback(() => {
    if (!thread.metadata.time) {
      return;
    }

    skipTo(thread.metadata.time);
  }, [skipTo]);

  return (
    <div
      ref={ref}
      className={styles.threadWrapper}
      data-highlight={highlightedThread || undefined}
    >
      {threadHasTime ? (
        <button className={styles.threadTime} onClick={handleButtonClick}>
          <TimeIcon />
          {formatTime(thread.metadata.time)}
        </button>
      ) : null}
      <Thread
        className={styles.thread}
        thread={thread}
        indentCommentContent={true}
      />
    </div>
  );
}

function sortThreads(
  a: ThreadData<ThreadMetadata>,
  b: ThreadData<ThreadMetadata>
) {
  if (a.metadata.timePercentage > b.metadata.timePercentage) {
    return 1;
  }

  if (a.metadata.timePercentage < b.metadata.timePercentage) {
    return -1;
  }

  return 0;
}
