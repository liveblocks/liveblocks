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
import { nanoid } from "nanoid";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useNotifyActivity } from "@/features/activity";
import { Composer } from "@/features/composer";
import { buildMessageListItems, Message } from "@/features/messages";
import { AI_USER_ID } from "@/lib/database";
import {
  getThreadFeedId,
  isChatMessage,
  type ChatMessage,
  type ThreadFeed,
} from "@/lib/feeds";
import { getMentionedUserIds } from "@/lib/mentions";
import type { MessageHighlight } from "@/lib/navigation";
import { getThreadParticipantIds } from "@/lib/threads";

type ThreadPanelProps = {
  channelId: string;
  parentMessageId: string;
  roomId: string;
  highlight?: MessageHighlight | null;
  onClose: () => void;
};

export function ThreadPanel({
  channelId,
  parentMessageId,
  roomId,
  highlight = null,
  onClose,
}: ThreadPanelProps) {
  const { messages } = useFeedMessages(channelId);
  const { feeds } = useFeeds({
    metadata: { type: "thread", channelId },
  });
  const rootMessage = messages
    .filter(isChatMessage)
    .find((message) => message.id === parentMessageId);
  const threadFeedId = getThreadFeedId(parentMessageId);
  const threadFeed = feeds.find((feed) => feed.feedId === threadFeedId);
  const highlightedMessageId =
    highlight?.feedId === threadFeedId ? highlight.messageId : null;

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
      <header className="flex shrink-0 items-center gap-3 px-4 pt-3">
        <div className="min-w-0">
          <h2 className="font-bold text-neutral-900">Thread</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-grow ml-auto rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Close thread"
        >
          <XIcon className="size-5" />
        </button>
      </header>

      {threadFeed ? (
        <ClientSideSuspense
          fallback={
            <ThreadConversation
              channelId={channelId}
              parentMessage={rootMessage}
              replies={[]}
              roomId={roomId}
              threadFeedId={threadFeedId}
              threadFeed={threadFeed}
              onClose={onClose}
            />
          }
        >
          <ThreadReplies
            channelId={channelId}
            parentMessage={rootMessage}
            roomId={roomId}
            threadFeed={threadFeed}
            highlightedMessageId={highlightedMessageId}
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
  highlightedMessageId,
  onClose,
}: {
  channelId: string;
  parentMessage: ChatMessage;
  roomId: string;
  threadFeed: ThreadFeed;
  highlightedMessageId: string | null;
  onClose: () => void;
}) {
  const { messages } = useFeedMessages(threadFeed.feedId);
  const replies = useMemo(() => messages.filter(isChatMessage), [messages]);

  return (
    <ThreadConversation
      channelId={channelId}
      parentMessage={parentMessage}
      replies={replies}
      roomId={roomId}
      threadFeedId={threadFeed.feedId}
      threadFeed={threadFeed}
      highlightedMessageId={highlightedMessageId}
      onClose={onClose}
    />
  );
}

function ThreadConversation({
  channelId,
  parentMessage,
  replies = [],
  roomId,
  threadFeedId,
  threadFeed,
  highlightedMessageId = null,
  onClose,
}: {
  channelId: string;
  parentMessage: ChatMessage;
  replies?: ChatMessage[];
  roomId: string;
  threadFeedId: string;
  threadFeed?: ThreadFeed;
  highlightedMessageId?: string | null;
  onClose: () => void;
}) {
  const self = useSelf();
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const deleteFeed = useDeleteFeed();
  const deleteFeedMessage = useDeleteFeedMessage();
  const updateFeedMetadata = useUpdateFeedMetadata();
  const notifyActivity = useNotifyActivity();
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const rootMentionsAi = parentMessage.data.content.includes(
    `<@${AI_USER_ID}>`
  );
  const sortedReplies = useMemo(
    () => [...(replies ?? [])].sort((a, b) => a.createdAt - b.createdAt),
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

  const highlightedLoaded =
    highlightedMessageId !== null &&
    sortedReplies.some((reply) => reply.id === highlightedMessageId);

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
        } catch {}
      }

      const messageId = nanoid();
      await createFeedMessage(
        threadFeedId,
        {
          userId: self.id,
          content,
        },
        { id: messageId }
      );

      const mentionedIds = getMentionedUserIds(content);
      const participantIdsToNotify = getThreadParticipantIds(history).filter(
        (userId) => !mentionedIds.includes(userId)
      );
      const location = {
        feedId: threadFeedId,
        messageId,
        parentFeedId: channelId,
        parentMessageId: parentMessage.id,
      };
      void notifyActivity(mentionedIds, { type: "mention", ...location });
      void notifyActivity(participantIdsToNotify, {
        type: "thread_reply",
        ...location,
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
        ...new Set([...(threadFeed?.metadata.participantIds ?? []), self.id]),
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
      history,
      notifyActivity,
      parentMessage.id,
      self.id,
      sortedReplies.length,
      threadFeed,
      threadFeedId,
      updateFeedMetadata,
    ]
  );

  const handleDelete = useCallback(
    async (message: ChatMessage) => {
      await deleteFeedMessage(threadFeedId, message.id);

      if (sortedReplies.length === 1) {
        try {
          await deleteFeed(threadFeedId);
        } catch {}
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
          <div className="px-5 pt-4">
            <div className="h-px bg-neutral-200" />
            <p className="py-4 text-sm text-neutral-500">
              No replies yet. Start the thread below.
            </p>
          </div>
        )}

        {items.map((item) => (
          <Message
            key={item.key}
            message={item.message}
            feedId={threadFeedId}
            showHeader={item.showHeader}
            variant="thread"
            highlighted={item.message.id === highlightedMessageId}
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
        forceAiReply={rootMentionsAi}
      />
    </>
  );
}
