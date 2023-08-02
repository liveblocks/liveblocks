"use client";

import React, { Suspense } from "react";
import { CommentsProvider, useThreads } from "../../../liveblocks.config";
import { Composer } from "@liveblocks/react-comments";
import { Thread } from "@liveblocks/react-comments";

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

export default function Home() {
  return (
    <CommentsProvider roomId="comments-react">
      <Suspense fallback={<Loading />}>
        <Example />
      </Suspense>
    </CommentsProvider>
  );
}

function Loading() {
  return (
    <div className="loading">
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}
