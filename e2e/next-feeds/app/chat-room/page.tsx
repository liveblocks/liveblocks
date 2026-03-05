"use client";

import { nanoid } from "@liveblocks/core";
import {
  ClientSideSuspense,
  RoomProvider,
  useCreateFeed,
  useCreateFeedMessage,
  useDeleteFeed,
  useFeedMessages,
  useFeeds,
  useUpdateFeedMessage,
  useUpdateFeedMetadata,
} from "@liveblocks/react/suspense";
import { Suspense, useEffect, useRef, useState } from "react";

const ROOM_ID = "liveblocks:examples:chat-room";

type FeedMessageData = {
  role: "user" | "assistant" | "system";
  content: string;
  feedThreadId?: string;
};

export default function Page() {
  return (
    <RoomProvider id={ROOM_ID}>
      <ClientSideSuspense
        fallback={
          <div className="h-screen w-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              role="presentation"
              className="lb-icon"
            >
              <path d="M3 10a7 7 0 0 1 7-7" className="lb-icon-spinner" />
            </svg>
          </div>
        }
      >
        <ChatRoom />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function ThreadMessage({
  message,
}: {
  message: { id: string; timestamp: number; data: FeedMessageData };
}) {
  const data = message.data as FeedMessageData;
  return (
    <div className="p-2 rounded bg-gray-50">
      <span className="text-xs font-medium text-gray-500 mr-2">{data.role}</span>
      <span className="text-xs text-gray-400">
        {new Date(message.timestamp).toLocaleTimeString()}
      </span>
      <p className="text-sm mt-1 whitespace-pre-wrap">{data.content}</p>
    </div>
  );
}

function ThreadView({
  feedThreadId,
  onCreateReply,
}: {
  feedThreadId: string;
  onCreateReply: (text: string) => void;
}) {
  const { messages } = useFeedMessages(feedThreadId);
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const handleSend = () => {
    const text = replyText.trim();
    if (!text) return;
    onCreateReply(text);
    setReplyText("");
  };

  return (
    <div className="ml-4 mt-2 pl-4 border-l-2 border-gray-200">
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {messages?.map((msg) => (
          <ThreadMessage key={msg.id} message={msg} />
        ))}
      </div>
      <div ref={bottomRef} />
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Reply in thread..."
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={handleSend}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  feedId,
  onReplyNewThread,
  onReplyInThread,
}: {
  message: { id: string; timestamp: number; data: FeedMessageData };
  feedId: string;
  onReplyNewThread: (replyText: string) => void;
  onReplyInThread: (threadFeedId: string, replyText: string) => void;
}) {
  const [expandedThread, setExpandedThread] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyInputText, setReplyInputText] = useState("");
  const data = message.data as FeedMessageData;
  const hasThread = !!data.feedThreadId;

  const handleSubmitNewThread = () => {
    const text = replyInputText.trim();
    if (!text) return;
    onReplyNewThread(text);
    setReplyInputText("");
    setShowReplyInput(false);
    setExpandedThread(true);
  };

  return (
    <div className="p-2 rounded bg-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-500 mr-2">
            {data.role}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          <p className="text-sm mt-1 whitespace-pre-wrap">{data.content}</p>
        </div>
        {!hasThread ? (
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 shrink-0"
          >
            Reply in thread
          </button>
        ) : (
          <button
            onClick={() => setExpandedThread(!expandedThread)}
            className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 shrink-0"
          >
            {expandedThread ? "Hide" : "Show"} thread
          </button>
        )}
      </div>
      {!hasThread && showReplyInput && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={replyInputText}
            onChange={(e) => setReplyInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitNewThread()}
            placeholder="Type a reply..."
            className="flex-1 px-3 py-2 border rounded text-sm"
            autoFocus
          />
          <button
            onClick={handleSubmitNewThread}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Reply
          </button>
        </div>
      )}
      {hasThread && expandedThread && (
        <Suspense
          fallback={
            <div className="mt-2 text-gray-500 text-sm">Loading thread...</div>
          }
        >
          <ThreadView
            feedThreadId={data.feedThreadId!}
            onCreateReply={(text) => onReplyInThread(data.feedThreadId!, text)}
          />
        </Suspense>
      )}
    </div>
  );
}

function MessagesPanel({
  feedId,
  onReplyToMessage,
}: {
  feedId: string;
  onReplyToMessage: (
    parentFeedId: string,
    messageId: string,
    messageData: FeedMessageData,
    replyText: string
  ) => void;
}) {
  const { messages } = useFeedMessages(feedId);
  const [newMessageText, setNewMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const createFeedMessageFn = useCreateFeedMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const sendMessage = () => {
    const text = newMessageText.trim();
    if (!text) return;
    createFeedMessageFn(feedId, { content: text, role: "user" });
    setNewMessageText("");
  };

  const handleReplyInThread = (threadFeedId: string, replyText: string) => {
    createFeedMessageFn(threadFeedId, { content: replyText, role: "user" });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!messages || messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet. Say hello!</p>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              <MessageBubble
                message={message}
                feedId={feedId}
                onReplyNewThread={(replyText) =>
                  onReplyToMessage(feedId, message.id, message.data as FeedMessageData, replyText)
                }
                onReplyInThread={handleReplyInThread}
              />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t bg-white flex gap-2">
        <input
          type="text"
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatRoom() {
  const { feeds, isLoading } = useFeeds({ metadata: { channel: true } });
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const createFeedFn = useCreateFeed();
  const deleteFeedFn = useDeleteFeed();
  const updateFeedMetadataFn = useUpdateFeedMetadata();
  const createFeedMessageFn = useCreateFeedMessage();
  const updateFeedMessageFn = useUpdateFeedMessage();

  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const channels = feeds ?? [];

  useEffect(() => {
    if (channels.length && !selectedFeedId) {
      setSelectedFeedId(channels[0].feedId);
    }
  }, [feeds, selectedFeedId]);

  useEffect(() => {
    if (selectedFeedId && !channels.some((c) => c.feedId === selectedFeedId)) {
      const mostRecent = [...channels].sort((a, b) => b.timestamp - a.timestamp)[0];
      setSelectedFeedId(mostRecent?.feedId ?? null);
    }
  }, [channels, selectedFeedId]);

  const createChatroom = () => {
    const feedId = nanoid();
    createFeedFn(feedId, {
      metadata: { name: "New Channel", channel: true, created: new Date().toISOString() },
    });
    setSelectedFeedId(feedId);
  };

  const startRenaming = (feed: { feedId: string; metadata?: { name?: string } }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFeedId(feed.feedId);
    setEditingName(feed.metadata?.name || `${feed.feedId.slice(0, 12)}...`);
  };

  const saveRename = (feedId: string, metadata: Record<string, unknown>) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      updateFeedMetadataFn(feedId, { ...metadata, name: trimmed });
    }
    setEditingFeedId(null);
    setEditingName("");
  };

  const cancelRename = () => {
    setEditingFeedId(null);
    setEditingName("");
  };

  const deleteChannel = (feedId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFeedFn(feedId);
    if (selectedFeedId === feedId) {
      const remaining = channels
        .filter((c) => c.feedId !== feedId)
        .sort((a, b) => b.timestamp - a.timestamp);
      setSelectedFeedId(remaining[0]?.feedId ?? null);
    }
  };

  const handleReplyToMessage = (
    parentFeedId: string,
    messageId: string,
    messageData: FeedMessageData,
    replyText: string
  ) => {
    const threadFeedId = nanoid();
    createFeedFn(threadFeedId, {
      metadata: { name: "Thread", channel: false, created: new Date().toISOString() },
    });
    updateFeedMessageFn(parentFeedId, messageId, {
      ...messageData,
      feedThreadId: threadFeedId,
    });
    createFeedMessageFn(threadFeedId, { content: replyText, role: "user" });
  };

  const feedName = (feed: { feedId: string; metadata?: { name?: string } }) =>
    feed.metadata?.name || `${feed.feedId.slice(0, 12)}...`;

  return (
    <main className="h-screen w-full flex">
      <aside className="w-60 border-r bg-gray-50 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold">Chat Rooms</h1>
          <button
            onClick={createChatroom}
            className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            New Channel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-gray-500 text-sm">Loading...</p>
          ) : !channels.length ? (
            <p className="p-4 text-gray-500 text-sm">
              No channels. Create one to get started!
            </p>
          ) : (
            channels.map((feed) => (
              <div
                key={feed.feedId}
                onClick={() => !editingFeedId && setSelectedFeedId(feed.feedId)}
                className={`flex items-center gap-2 w-full text-left px-4 py-3 border-b hover:bg-gray-100 cursor-pointer group ${selectedFeedId === feed.feedId ? "bg-white border-l-4 border-l-blue-500" : ""
                  }`}
              >
                {editingFeedId === feed.feedId ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => saveRename(feed.feedId, { ...(feed.metadata || {}) })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveRename(feed.feedId, { ...(feed.metadata || {}) });
                      } else if (e.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span className="font-medium text-sm truncate flex-1 min-w-0">
                    #{feedName(feed)}
                  </span>
                )}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => startRenaming(feed, e)}
                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    aria-label="Rename chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => deleteChannel(feed.feedId, e)}
                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                    aria-label="Delete chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFeedId ? (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Loading messages...
              </div>
            }
          >
            <MessagesPanel
              feedId={selectedFeedId}
              onReplyToMessage={handleReplyToMessage}
            />
          </Suspense>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat room or create a new one
          </div>
        )}
      </div>
    </main>
  );
}
