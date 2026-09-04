"use client";

import { useFeedMessages } from "@liveblocks/react/suspense";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Message } from "@/components/message";
import type { ChatMessage } from "@/lib/types";

export function MessageList({
  feedId,
  repoUrl,
}: {
  feedId: string;
  repoUrl: string;
}) {
  const { messages, hasFetchedAll, fetchMore, isFetchingMore } =
    useFeedMessages(feedId);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages]
  );

  // A human message is "queued" while an agent reply that started before it
  // is still running: it will be handled in a follow-up run. That agent
  // reply, in turn, is "holding" — whatever it has written so far is only a
  // draft, so the UI hides it rather than flashing a reply that gets revised.
  const { queuedIds, holdingIds } = useMemo(() => {
    const queued = new Set<string>();
    const holding = new Set<string>();
    let runningAgent: ChatMessage | null = null;
    for (const message of sorted) {
      if (message.data.role === "agent") {
        runningAgent = message.data.status === "running" ? message : null;
      } else if (
        runningAgent !== null &&
        !message.data.handled &&
        message.createdAt > runningAgent.createdAt
      ) {
        queued.add(message.id);
        holding.add(runningAgent.id);
      }
    }
    return { queuedIds: queued, holdingIds: holding };
  }, [sorted]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 80;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stickToBottomRef.current) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [sorted]);

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-5 px-6 py-6">
        {!hasFetchedAll ? (
          <button
            type="button"
            onClick={fetchMore}
            disabled={isFetchingMore}
            className="mx-auto flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:bg-panel-hover disabled:opacity-60"
          >
            {isFetchingMore ? (
              <Loader2Icon className="size-3 animate-spin" />
            ) : null}
            Load earlier messages
          </button>
        ) : null}
        {sorted.map((message: ChatMessage) => (
          <Message
            key={message.id}
            message={message}
            feedId={feedId}
            repoUrl={repoUrl}
            queued={queuedIds.has(message.id)}
            holding={holdingIds.has(message.id)}
          />
        ))}
      </div>
    </div>
  );
}
