"use client";

import { ThreadHighlightEvent, useThreads } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import { useEffect, useState } from "react";
import styles from "./Threads.module.css";

export function Threads() {
  return (
    <ClientSideSuspense fallback={null}>
      {() => <ThreadList />}
    </ClientSideSuspense>
  );
}

function ThreadList() {
  const { threads } = useThreads();
  const [highlightedId, setHighlightedId] = useState("");

  useEffect(() => {
    function handleHighlight(event: ThreadHighlightEvent) {
      if (!event.detail?.threadId) {
        return;
      }

      setHighlightedId("");
      setTimeout(() => setHighlightedId(event.detail.threadId));
    }

    window.addEventListener("threadHighlight", handleHighlight as any);

    return () => {
      window.removeEventListener("threadHighlight", handleHighlight as any);
    };
  }, []);

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
