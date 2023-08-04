"use client";

import { Composer, Thread } from "@liveblocks/react-comments";
import { useThreadsSuspense as useThreads } from "../../../../liveblocks.config";

export function Example() {
  const threads = useThreads();

  return (
    <main>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
    </main>
  );
}
