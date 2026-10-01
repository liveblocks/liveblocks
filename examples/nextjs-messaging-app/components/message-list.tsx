"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFeedMessages, useFeeds } from "@liveblocks/react/suspense";
import {
  buildMessageListItems,
  DayDivider,
  Message,
} from "@/components/message";
import { AI_USER_ID } from "@/app/database";
import { isChatMessage } from "@/lib/activity";
import type { Conversation } from "@/lib/conversations";
import type { ThreadFeed } from "@/lib/threads";

// How many extra pages to load while looking for a highlighted message
const MAX_EXTRA_PAGES = 4;

export function MessageList({
  conversation,
  highlightedMessageId = null,
  onOpenThread,
}: {
  conversation: Conversation;
  highlightedMessageId?: string | null;
  onOpenThread?: (messageId: string) => void;
}) {
  const channelId = conversation.feedId;
  const { messages, hasFetchedAll, fetchMore, isFetchingMore } =
    useFeedMessages(channelId);
  const [extraPages, setExtraPages] = useState(0);
  const { feeds } = useFeeds({
    metadata: { type: "thread", channelId },
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const ignoreScrollRef = useRef(false);
  const channelRef = useRef(channelId);

  if (channelRef.current !== channelId) {
    channelRef.current = channelId;
    stickToBottomRef.current = true;
  }

  const items = useMemo(
    () => buildMessageListItems(messages.filter(isChatMessage)),
    [messages]
  );
  const threadsByParentMessageId = useMemo(() => {
    const threads = new Map<string, ThreadFeed>();
    for (const feed of feeds) {
      const parentMessageId = feed.metadata.parentMessageId;
      if (parentMessageId) {
        threads.set(parentMessageId, feed);
      }
    }
    return threads;
  }, [feeds]);

  const pinToBottom = () => {
    const container = containerRef.current;
    if (!container || !stickToBottomRef.current) {
      return;
    }

    const top = container.scrollHeight - container.clientHeight;
    if (Math.abs(container.scrollTop - top) < 1) {
      return;
    }

    ignoreScrollRef.current = true;
    container.scrollTop = top;
    requestAnimationFrame(() => {
      ignoreScrollRef.current = false;
    });
  };

  useLayoutEffect(() => {
    pinToBottom();
    const frame = requestAnimationFrame(pinToBottom);
    return () => cancelAnimationFrame(frame);
  }, [channelId, items, hasFetchedAll, threadsByParentMessageId]);

  // Jumping to a message (from Activity) wins over sticking to the bottom.
  // If it isn't loaded yet, page back through the history to find it.
  const highlightedLoaded =
    highlightedMessageId !== null &&
    items.some(
      (item) => item.type === "message" && item.message.id === highlightedMessageId
    );

  useLayoutEffect(() => {
    if (!highlightedLoaded || !highlightedMessageId) {
      return;
    }
    const element = containerRef.current?.querySelector(
      `[data-message-id="${CSS.escape(highlightedMessageId)}"]`
    );
    if (element) {
      stickToBottomRef.current = false;
      element.scrollIntoView({ block: "center" });
    }
  }, [highlightedLoaded, highlightedMessageId]);

  useEffect(() => {
    if (
      highlightedMessageId === null ||
      highlightedLoaded ||
      hasFetchedAll ||
      isFetchingMore ||
      extraPages >= MAX_EXTRA_PAGES
    ) {
      return;
    }
    setExtraPages((pages) => pages + 1);
    fetchMore();
  }, [
    extraPages,
    fetchMore,
    hasFetchedAll,
    highlightedLoaded,
    highlightedMessageId,
    isFetchingMore,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    const handleScroll = () => {
      if (ignoreScrollRef.current) {
        ignoreScrollRef.current = false;
        return;
      }

      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 80;
    };

    // Thread rows and other late layout land after the first pin, which
    // leaves the view a little short of the latest message.
    const observer = new ResizeObserver(() => {
      pinToBottom();
    });
    observer.observe(content);

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [channelId]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]"
    >
      {/* Bottom-anchored like Slack: history grows upward from the composer. */}
      <div
        ref={contentRef}
        className="flex min-h-full flex-col justify-end pb-4"
      >
        {hasFetchedAll ? <ConversationIntro conversation={conversation} /> : null}
        {items.map((item) =>
          item.type === "divider" ? (
            <DayDivider key={item.key} label={item.label} />
          ) : (
            <Message
              key={item.key}
              message={item.message}
              feedId={channelId}
              showHeader={item.showHeader}
              threadFeed={threadsByParentMessageId.get(item.message.id)}
              highlighted={item.message.id === highlightedMessageId}
              onOpenThread={
                onOpenThread ? () => onOpenThread(item.message.id) : undefined
              }
            />
          )
        )}
      </div>
    </div>
  );
}

function ConversationIntro({ conversation }: { conversation: Conversation }) {
  if (conversation.type === "dm") {
    return <DmIntro user={conversation.user} />;
  }
  return <ChannelIntro channelName={conversation.channel.name} />;
}

function DmIntro({ user }: { user: Liveblocks["UserMeta"] }) {
  const isAgent = user.id === AI_USER_ID;

  return (
    <div className="px-5 pb-6 pt-8">
      <span className="mb-2 block size-12 overflow-hidden rounded-xl bg-neutral-200">
        <img
          src={user.info.avatar}
          alt=""
          className="size-full object-cover"
        />
      </span>
      <h3 className="text-xl font-bold text-neutral-900">{user.info.name}</h3>
      <p className="mt-1 text-sm text-neutral-500">
        {isAgent ? (
          <>
            This is your conversation with{" "}
            <span className="font-medium text-neutral-700">
              {user.info.name}
            </span>
            . Ask anything, and it will reply right here.
          </>
        ) : (
          <>
            This is the very beginning of your direct message history with{" "}
            <span className="font-medium text-neutral-700">
              {user.info.name}
            </span>
            . Say hi, or @mention the AI to start a thread.
          </>
        )}
      </p>
    </div>
  );
}

function ChannelIntro({ channelName }: { channelName: string }) {
  return (
    <div className="px-5 pb-6 pt-8">
      <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-sidebar text-2xl font-bold text-white">
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
