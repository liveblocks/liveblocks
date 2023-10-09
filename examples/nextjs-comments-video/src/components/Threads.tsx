"use client";

import { ThreadMetadata, useThreads } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import { useCallback, useEffect, useState } from "react";
import styles from "./Threads.module.css";
import { useHighlightThreadListener, useSkipTo } from "@/utils";
import { ThreadData } from "@liveblocks/core";

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
        <CustomThread
          key={thread.id}
          thread={thread}
          highlighted={thread.id === highlightedId}
        />
      ))}
    </div>
  );
}

function CustomThread({
  thread,
  highlighted,
}: {
  thread: ThreadData<ThreadMetadata>;
  highlighted: boolean;
}) {
  const threadHasTime = thread.metadata.timePercentage !== null;
  const skipTo = useSkipTo();

  const handleButtonClick = useCallback(() => {
    if (!thread.metadata.timePercentage) {
      return;
    }

    skipTo(thread.metadata.timePercentage);
  }, [skipTo]);

  return (
    <div>
      {threadHasTime ? (
        <button onClick={handleButtonClick}>Skip to comment time</button>
      ) : null}
      <Thread
        className={styles.thread}
        thread={thread}
        data-highlight={highlighted || undefined}
      />
    </div>
  );
}
