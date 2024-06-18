"use client";

import { formatTime } from "@/components/Duration";
import { useThreads } from "@liveblocks/react/suspense";
import { useSkipTo } from "@/utils";
import { ThreadData } from "@liveblocks/core";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-ui";
import { useCallback, useRef, useState } from "react";
import {
  Clock as ClockIcon,
  MessageSquare as MessageSquareIcon,
} from "react-feather";

export function Threads() {
  return (
    <ClientSideSuspense fallback={null}>
      <ThreadList />
    </ClientSideSuspense>
  );
}

function ThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return null;
  }

  return (
    <div className="border border-neutral-200 mt-12 sm:mt-16 rounded-lg overflow-hidden shadow-sm bg-white flex flex-col divide-y divide-neutral-200 max-w-screen-sm mx-auto">
      <div className="p-4 font-medium flex gap-2 items-center">
        <MessageSquareIcon className="size-4 text-neutral-600" />
        {threads.length} comment{threads.length > 1 ? "s" : ""}
      </div>
      {threads.sort(sortThreads).map((thread) => (
        <CustomThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function CustomThread({ thread }: { thread: ThreadData }) {
  const ref = useRef<HTMLDivElement>(null);
  const threadHasTime = thread.metadata.timePercentage !== -1;
  const skipTo = useSkipTo();
  const [highlightedThread, setHighlightedThread] = useState(false);

  // Skip to metadata time
  const handleButtonClick = useCallback(() => {
    if (!thread.metadata.time) {
      return;
    }

    skipTo(thread.metadata.time);
    // Scroll to the top
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [skipTo]);

  return (
    <div
      ref={ref}
      className="relative"
      data-highlight={highlightedThread || undefined}
    >
      {threadHasTime ? (
        <button
          type="button"
          className="ml-4 mt-4 inline-flex gap-1.5 h-7 px-2 rounded items-center text-xs tabular-nums bg-accent/5 hover:accent/10 text-accent hover:bg-accent/10 focus:bg-accent/10 font-medium transition-colors ease-out duration-150"
          onClick={handleButtonClick}
          title={`Go to: ${formatTime(thread.metadata.time)}`}
        >
          <ClockIcon className="size-3" />
          <span className="sr-only">Go to: </span>
          {formatTime(thread.metadata.time)}
        </button>
      ) : null}
      <Thread thread={thread} indentCommentContent={true} />
    </div>
  );
}

function sortThreads(a: ThreadData, b: ThreadData) {
  if (a.metadata.timePercentage > b.metadata.timePercentage) {
    return 1;
  }

  if (a.metadata.timePercentage < b.metadata.timePercentage) {
    return -1;
  }

  return 0;
}
