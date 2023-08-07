"use client";

import { Composer, Thread } from "@liveblocks/react-comments";
import { useThreads } from "../../../liveblocks.config";
import { Loading } from "../../components/Loading";

export function Example() {
  const { isLoading, threads, error } = useThreads();

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="error">There was an error while fetching the threads</div>
    );
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
