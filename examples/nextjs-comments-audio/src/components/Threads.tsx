"use client";

import { formatTime } from "@/components/Duration";
import { ThreadMetadata, useThreads } from "@/liveblocks.config";
import { useSkipTo } from "@/utils";
import { ThreadData } from "@liveblocks/core";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import { useCallback, useRef, useState } from "react";
import {
  Clock as ClockIcon,
  MessageSquare as MessageSquareIcon,
} from "react-feather";

export function Threads() {
  return (
    <ClientSideSuspense fallback={null}>
      {() => <ThreadList />}
    </ClientSideSuspense>
  );
}

function ThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return;
  }

  return (
    <div className="border border-primary mt-12 sm:mt-16 rounded-lg overflow-hidden shadow bg-secondary flex flex-col divide-y divide-primary max-w-screen-md mx-auto">
      <div className="p-4 font-medium flex gap-2 items-center">
        <MessageSquareIcon className="size-4 text-secondary" />
        {threads.length} reactions
      </div>
      {threads.sort(sortThreads).map((thread) => (
        <CustomThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function CustomThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
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
          className="ml-4 mt-4 inline-flex gap-1.5 h-7 px-2 rounded items-center text-xs tabular-nums bg-tertiary hover:bg-quaternary focus:bg-quaternary font-medium"
          onClick={handleButtonClick}
          title={`Go to: ${formatTime(thread.metadata.time)}`}
        >
          <ClockIcon className="size-3 text-secondary" />
          <span className="sr-only">Go to: </span>
          {formatTime(thread.metadata.time)}
        </button>
      ) : null}
      <Thread thread={thread} indentCommentContent={true} />
    </div>
  );
}

function sortThreads(
  a: ThreadData<ThreadMetadata>,
  b: ThreadData<ThreadMetadata>
) {
  if (a.metadata.timePercentage > b.metadata.timePercentage) {
    return 1;
  }

  if (a.metadata.timePercentage < b.metadata.timePercentage) {
    return -1;
  }

  return 0;
}
