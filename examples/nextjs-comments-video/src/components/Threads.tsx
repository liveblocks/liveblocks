"use client";

import { ThreadMetadata, useThreads } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import { useCallback, useEffect, useState } from "react";
import styles from "./Threads.module.css";
import {
  resetAllHighlights,
  useHighlightPin,
  useHighlightThreadListener,
  useSkipTo,
} from "@/utils";
import { ThreadData } from "@liveblocks/core";
import { formatTime } from "@/components/Duration";

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

  if (threads.length === 0) {
    return <div>No comments yet!</div>;
  }

  return (
    <div>
      {threads.map((thread) => (
        <CustomThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function CustomThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
  const threadHasTime = thread.metadata.timePercentage !== null;
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
    >
      {threadHasTime ? (
        <button onClick={handleButtonClick}>
          Skip to {formatTime(thread.metadata.time)}
        </button>
      ) : null}
      <Thread
        className={styles.thread}
        thread={thread}
        data-highlight={highlightedThread || undefined}
      />
    </div>
  );
}
