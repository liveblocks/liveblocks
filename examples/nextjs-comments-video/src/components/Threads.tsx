"use client";

import { useThreads } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";

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
    <div>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
