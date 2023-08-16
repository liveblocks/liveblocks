"use client";

import React, { Suspense } from "react";
import { RoomProvider, useThreads } from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { Composer, Thread } from "@liveblocks/react-comments";

function Example() {
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

export default function Page() {
  return (
    <RoomProvider id="nextjs-comments" initialPresence={{}}>
      <Suspense fallback={<Loading />}>
        <Example />
      </Suspense>
    </RoomProvider>
  );
}
