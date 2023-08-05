"use client";

import React from "react";
import { RoomProvider, useThreads } from "../../../liveblocks.config";
import { Composer } from "@liveblocks/react-comments";
import { Thread } from "@liveblocks/react-comments";
import { Loading } from "../../components/Loading";

function Example() {
  const { isLoading, threads, error } = useThreads();

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <div>Fail!</div>;
  }

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
      <Example />
    </RoomProvider>
  );
}
