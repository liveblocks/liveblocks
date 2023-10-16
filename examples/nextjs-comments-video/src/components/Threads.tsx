"use client";

import { ThreadMetadata, useThreads } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import { useCallback, useState } from "react";
import styles from "./Threads.module.css";
import {
  resetAllHighlights,
  useHighlightPin,
  useHighlightThreadListener,
  useSkipTo,
} from "@/utils";
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
    return <div>No comments yet!</div>;
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
  const threadHasTime = thread.metadata.timePercentage !== -1;
  const skipTo = useSkipTo();
  const highlightPin = useHighlightPin(thread.id);

  const [highlightedThread, setHighlightedThread] = useState(false);

  useHighlightThreadListener((threadId) => {
    if (thread.id !== threadId) {
      setHighlightedThread(false);
      return;
    }

    setHighlightedThread(false);
    setTimeout(() => setHighlightedThread(true));
  });

  const handleButtonClick = useCallback(() => {
    if (!thread.metadata.timePercentage) {
      return;
    }

    skipTo(thread.metadata.timePercentage);
  }, [skipTo]);

  return (
    <div
      className={styles.threadWrapper}
      onPointerEnter={highlightPin}
      onPointerLeave={resetAllHighlights}
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
