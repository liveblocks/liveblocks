"use client";

import React from "react";
import {
  CommentsProvider,
  useThreadsSuspense as useThreads,
} from "../../../../liveblocks.config";
import { Composer } from "@liveblocks/react-comments";
import { Thread } from "@liveblocks/react-comments";
import { ClientSideSuspense } from "../../../components/ClientSideSuspense";
import { Loading } from "../../../components/Loading";

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
    <CommentsProvider roomId="nextjs-comments">
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </CommentsProvider>
  );
}
