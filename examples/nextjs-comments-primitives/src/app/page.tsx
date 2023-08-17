"use client";

import {
  RoomProvider,
  useCreateThread,
  useThreads,
} from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { Composer } from "../components/Composer";
import { Thread } from "../components/Thread";
import { ClientSideSuspense } from "@liveblocks/react";

/**
 * Displays a list of threads, each allowing comment replies, along
 * with a composer for creating new threads.
 */

function Example() {
  const threads = useThreads();
  const createThread = useCreateThread();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="rounded-xl bg-white shadow-md"
        />
      ))}
      <Composer
        onComposerSubmit={({ body }) => {
          createThread({ body });
        }}
        className="rounded-xl bg-white shadow-md"
      />
    </main>
  );
}

export default function Page() {
  return (
    <RoomProvider id="nextjs-comments-primitives" initialPresence={{}}>
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
