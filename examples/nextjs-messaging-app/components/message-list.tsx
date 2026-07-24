"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFeedMessages } from "@liveblocks/react/suspense";
import {
  buildMessageListItems,
  DayDivider,
  Message,
} from "@/components/message";

export function MessageList({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const { messages, hasFetchedAll } = useFeedMessages(channelId);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const items = useMemo(
    () => buildMessageListItems(messages ?? []),
    [messages]
  );

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
  }, [items]);

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
      {/* Bottom-anchored like Slack: history grows upward from the composer. */}
      <div className="flex min-h-full flex-col justify-end pb-4">
        {hasFetchedAll ? <ChannelIntro channelName={channelName} /> : null}
        {items.map((item) =>
          item.type === "divider" ? (
            <DayDivider key={item.key} label={item.label} />
          ) : (
            <Message
              key={item.key}
              message={item.message}
              feedId={channelId}
              showHeader={item.showHeader}
            />
          )
        )}
      </div>
    </div>
  );
}

function ChannelIntro({ channelName }: { channelName: string }) {
  return (
    <div className="px-4 pb-6 pt-8">
      <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-[var(--sidebar-bg)] text-2xl font-bold text-white">
        #
      </div>
      <h3 className="text-xl font-bold text-neutral-900">
        Welcome to #{channelName}
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        This is the very beginning of the{" "}
        <span className="font-medium text-neutral-700">#{channelName}</span>{" "}
        channel. Say something, or @mention the AI to get a reply.
      </p>
    </div>
  );
}
