import { useThreads } from "@liveblocks/react/suspense";
import { Composer, Thread, ThreadProps } from "@liveblocks/react-ui";
import { useThreadSubscription } from "@liveblocks/react";
import { ThreadData } from "@liveblocks/client";
import { useEffect } from "react";

function Example() {
  const { threads } = useViewThreads("my-view-id");

  return (
    <main>
      {/**
       * Show all threads
       */}
      <div>ALL THREADS</div>
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} className="thread" />
      ))}
      <Composer className="composer" />
      {/**
       * Show only subscribed threads
       */}
      <div>MY THREADS</div>
      {threads.map((thread) => (
        <SubscribedThread key={thread.id} thread={thread} className="thread" />
      ))}
    </main>
  );
}

const SubscribedThread = ({
  thread,
  ...props
}: { thread: ThreadData } & ThreadProps) => {
  const { status } = useThreadSubscription(thread.id);

  if (status === "subscribed") {
    return (
      <Thread key={thread.id} thread={thread} className="thread" {...props} />
    );
  }

  return null;
};

/**
 * - Uses the pagination API to fetch threads
 * - Uses the viewId metadata to filter threads
 */
function useViewThreads(viewId: string) {
  const { threads, hasFetchedAll, fetchMore, isFetchingMore } = useThreads({
    query: {
      metadata: {
        viewId,
      },
    },
  });

  useEffect(() => {
    if (!hasFetchedAll && !isFetchingMore) {
      fetchMore();
    }
  }, [hasFetchedAll, isFetchingMore, fetchMore]);

  return {
    threads,
    isLoading: !hasFetchedAll || isFetchingMore,
  };
}
