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
  const { messages } = useFeedMessages(channelId);
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
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center px-6 text-sm text-neutral-500">
          No messages yet. Say hello in #{channelName}.
        </div>
      ) : (
        <div className="py-4">
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
      )}
    </div>
  );
}
