"use client";

import { RoomProvider, useThreads } from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads.
 */

function Example() {
  const threads = useThreads();

  return (
    <main>
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          showComposer
          className="thread"
        />
      ))}
      <Composer className="composer" />
    </main>
  );
}

export default function Page() {
  return (
    <RoomProvider id="nextjs-comments" initialPresence={{}}>
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
