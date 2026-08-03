"use client";

import {
  ClientSideSuspense,
  useCreateFeed,
  useCreateFeedMessage,
  useDeleteFeed,
  useDeleteFeedMessage,
  useFeedMessages,
  useFeeds,
  useSelf,
  useUpdateFeedMetadata,
} from "@liveblocks/react/suspense";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Composer } from "@/components/composer";
import {
  buildMessageListItems,
  type FeedMessage,
  Message,
} from "@/components/message";
import { getThreadFeedId, type ThreadFeed } from "@/lib/threads";

type ThreadPanelProps = {
  channelId: string;
  channelName: string;
  parentMessageId: string;
  roomId: string;
  onClose: () => void;
};

export function ThreadPanel({
  channelId,
  channelName,
  parentMessageId,
  roomId,
  onClose,
}: ThreadPanelProps) {
  const { messages } = useFeedMessages(channelId);
  const { feeds } = useFeeds({
    metadata: { type: "thread", channelId },
  });
  const rootMessage = messages.find(
    (message) => message.id === parentMessageId
  );
  const threadFeedId = getThreadFeedId(parentMessageId);
  const threadFeed = feeds.find((feed) => feed.feedId === threadFeedId);

  useEffect(() => {
    if (!rootMessage) {
      onClose();
    }
  }, [onClose, rootMessage]);

  if (!rootMessage) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-full max-w-[420px] flex-col bg-white shadow-xl md:static md:z-auto md:w-[380px] md:shrink-0 md:border-l md:border-neutral-200 md:shadow-none">
      <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-bold text-neutral-900">Thread</h2>
          <p className="truncate text-xs text-neutral-500">#{channelName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Close thread"
        >
          <XIcon className="size-5" />
        </button>
      </header>

      {threadFeed ? (
        <ClientSideSuspense fallback={null}>
          <ThreadReplies
            channelId={channelId}
            parentMessage={rootMessage}
            roomId={roomId}
            threadFeed={threadFeed}
            onClose={onClose}
          />
        </ClientSideSuspense>
      ) : (
        <ThreadConversation
          channelId={channelId}
          parentMessage={rootMessage}
          replies={[]}
          roomId={roomId}
          threadFeedId={threadFeedId}
          onClose={onClose}
        />
      )}
    </aside>
  );
}

function ThreadReplies({
  channelId,
  parentMessage,
  roomId,
  threadFeed,
  onClose,
}: {
  channelId: string;
  parentMessage: FeedMessage;
  roomId: string;
  threadFeed: ThreadFeed;
  onClose: () => void;
}) {
  const { messages } = useFeedMessages(threadFeed.feedId);

  return (
    <ThreadConversation
      channelId={channelId}
      parentMessage={parentMessage}
      replies={messages}
      roomId={roomId}
      threadFeedId={threadFeed.feedId}
      threadFeed={threadFeed}
      onClose={onClose}
    />
  );
}

function ThreadConversation({
  channelId,
  parentMessage,
  replies,
  roomId,
  threadFeedId,
  threadFeed,
  onClose,
}: {
  channelId: string;
  parentMessage: FeedMessage;
  replies: FeedMessage[];
  roomId: string;
  threadFeedId: string;
  threadFeed?: ThreadFeed;
  onClose: () => void;
}) {
  const self = useSelf();
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const deleteFeed = useDeleteFeed();
  const deleteFeedMessage = useDeleteFeedMessage();
  const updateFeedMetadata = useUpdateFeedMetadata();
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const sortedReplies = useMemo(
    () => [...replies].sort((a, b) => a.createdAt - b.createdAt),
    [replies]
  );
  const items = useMemo(
    () =>
      buildMessageListItems(sortedReplies, { dayDividers: false }).filter(
        (item) => item.type === "message"
      ),
    [sortedReplies]
  );
  const history = useMemo(
    () =>
      [parentMessage, ...sortedReplies].map((message) => ({
        userId: message.data.userId,
        content: message.data.content,
      })),
    [parentMessage, sortedReplies]
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
    if (container && stickToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [items]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!threadFeed) {
        try {
          await createFeed(threadFeedId, {
            metadata: {
              type: "thread",
              channelId,
              parentMessageId: parentMessage.id,
              replyCount: "0",
              participantIds: [],
            },
          });
        } catch {
          // Another participant may have created the thread first.
        }
      }

      await createFeedMessage(threadFeedId, {
        userId: self.id,
        content,
      });

      const parsedReplyCount = Number.parseInt(
        threadFeed?.metadata.replyCount ?? "0",
        10
      );
      const currentReplyCount = Math.max(
        sortedReplies.length,
        Number.isNaN(parsedReplyCount) ? 0 : parsedReplyCount
      );
      const participantIds = [
        ...new Set([
          ...(threadFeed?.metadata.participantIds ?? []),
          self.id,
        ]),
      ];

      await updateFeedMetadata(threadFeedId, {
        ...(threadFeed?.metadata ?? {}),
        type: "thread",
        channelId,
        parentMessageId: parentMessage.id,
        replyCount: String(currentReplyCount + 1),
        participantIds,
      });
    },
    [
      channelId,
      createFeed,
      createFeedMessage,
      parentMessage.id,
      self.id,
      sortedReplies.length,
      threadFeed,
      threadFeedId,
      updateFeedMetadata,
    ]
  );

  const handleDelete = useCallback(
    async (message: FeedMessage) => {
      await deleteFeedMessage(threadFeedId, message.id);

      if (sortedReplies.length === 1) {
        try {
          await deleteFeed(threadFeedId);
        } catch {
          // The thread feed may already have been deleted.
        }
        onClose();
        return;
      }

      const remainingReplies = sortedReplies.filter(
        (reply) => reply.id !== message.id
      );
      const participantIds = [
        ...new Set(remainingReplies.map((reply) => reply.data.userId)),
      ];

      await updateFeedMetadata(threadFeedId, {
        ...(threadFeed?.metadata ?? {}),
        type: "thread",
        channelId,
        parentMessageId: parentMessage.id,
        replyCount: String(remainingReplies.length),
        participantIds,
      });
    },
    [
      channelId,
      deleteFeed,
      deleteFeedMessage,
      onClose,
      parentMessage.id,
      sortedReplies,
      threadFeed?.metadata,
      threadFeedId,
      updateFeedMetadata,
    ]
  );

  return (
    <>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto py-4">
        <Message
          message={parentMessage}
          feedId={channelId}
          showHeader
          variant="thread"
        />

        {sortedReplies.length > 0 ? (
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="shrink-0 text-xs text-neutral-500">
              {sortedReplies.length}{" "}
              {sortedReplies.length === 1 ? "reply" : "replies"}
            </span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-neutral-500">
            No replies yet. Start the thread below.
          </p>
        )}

        {items.map((item) => (
          <Message
            key={item.key}
            message={item.message}
            feedId={threadFeedId}
            showHeader={item.showHeader}
            variant="thread"
            onDelete={() => handleDelete(item.message)}
          />
        ))}
      </div>

      <Composer
        feedId={threadFeedId}
        roomId={roomId}
        placeholder="Reply…"
        history={history}
        onSend={handleSend}
      />
    </>
  );
}
