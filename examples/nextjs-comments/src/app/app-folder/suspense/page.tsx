"use client";

import React from "react";
import {
  RoomProvider,
  useThreadsSuspense as useThreads,
} from "../../../../liveblocks.config";
import { Composer } from "@liveblocks/react-comments";
import { Thread } from "@liveblocks/react-comments";
import { ClientSideSuspense } from "@liveblocks/react";
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
    <RoomProvider id="nextjs-comments" initialPresence={{}}>
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
