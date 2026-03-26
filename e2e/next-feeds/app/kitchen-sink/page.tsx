"use client";
import { LiveblocksError, nanoid } from "@liveblocks/core";
import {
  RoomProvider,
  useCreateFeed,
  useCreateFeedMessage,
  useDeleteFeed,
  useDeleteFeedMessage,
  useFeedMessages,
  useFeeds,
  useUpdateFeedMetadata,
  useUpdateFeedMessage,
} from "@liveblocks/react";
import { useState } from "react";

const ROOM_ID = "liveblocks:examples:feeds:sql";

const FEEDS_PAGE_LIMIT = 3;

function randomSinkTag(): "alpha" | "beta" {
  return Math.random() < 0.5 ? "alpha" : "beta";
}

export default function Page() {
  return (
    <RoomProvider id={ROOM_ID}>
      <Sample />
    </RoomProvider>
  );
}

function FeedMessages({
  feedId,
  newMessageText,
  onMessageTextChange,
  onCreateMessage,
  onCreateMessageHttp,
  onUpdateMessage,
  onUpdateMessageHttp,
  onDeleteMessage,
  onDeleteMessageHttp,
}: {
  feedId: string;
  newMessageText: string;
  onMessageTextChange: (text: string) => void;
  onCreateMessage: () => void;
  onCreateMessageHttp: () => void;
  onUpdateMessage: (messageId: string) => void;
  onUpdateMessageHttp: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteMessageHttp: (messageId: string) => void;
}) {
  const { messages, error: messagesError, isLoading: messagesLoading } =
    useFeedMessages(feedId);

  if (messagesError) {
    return (
      <div className="mt-4 border-t pt-4 rounded border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
        <p className="font-medium">Could not load messages</p>
        <p className="mt-1">{messagesError.message}</p>
      </div>
    );
  }

  if (messagesLoading) {
    return (
      <div className="mt-4 border-t pt-4 text-gray-500 text-sm">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="font-semibold mb-2">Messages ({messages?.length || 0})</h4>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newMessageText || ""}
          onChange={(e) => onMessageTextChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              onCreateMessage();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={onCreateMessage}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Send
        </button>
        <button
          onClick={onCreateMessageHttp}
          className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
        >
          Send (http)
        </button>
      </div>

      <div className="space-y-2">
        {!messages || messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-start justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(message.timestamp).toLocaleString()}
                </div>
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              </div>
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => onUpdateMessage(message.id)}
                  className="px-2 py-1 text-xs bg-yellow-100 rounded hover:bg-yellow-200"
                >
                  Update
                </button>
                <button
                  onClick={() => onUpdateMessageHttp(message.id)}
                  className="px-2 py-1 text-xs bg-yellow-200 rounded hover:bg-yellow-300"
                >
                  Update (http)
                </button>
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="px-2 py-1 text-xs bg-red-100 rounded hover:bg-red-200"
                >
                  Delete
                </button>
                <button
                  onClick={() => onDeleteMessageHttp(message.id)}
                  className="px-2 py-1 text-xs bg-red-300 rounded hover:bg-red-400"
                >
                  Delete (http)
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Sample() {
  const [sinkFilter, setSinkFilter] = useState<"all" | "alpha" | "beta">("all");
  const {
    feeds,
    isLoading,
    error,
    hasFetchedAll,
    isFetchingMore,
    fetchMore,
    fetchMoreError,
  } = useFeeds({
    limit: FEEDS_PAGE_LIMIT,
    metadata:
      sinkFilter === "all" ? undefined : { sinkTag: sinkFilter },
  });
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState<Record<string, string>>({});

  const createFeedFn = useCreateFeed();
  const deleteFeedFn = useDeleteFeed();
  const updateFeedMetadataFn = useUpdateFeedMetadata();
  const createFeedMessageFn = useCreateFeedMessage();
  const updateFeedMessageFn = useUpdateFeedMessage();
  const deleteFeedMessageFn = useDeleteFeedMessage();

  const createFeed = () => {
    const feedId = nanoid();
    createFeedFn(feedId, {
      metadata: {
        created: new Date().toISOString(),
        sinkTag: randomSinkTag(),
      },
    });
  };

  const createFeedHttp = async () => {
    try {
      const response = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: ROOM_ID,
          feedId: nanoid(),
          metadata: {
            created: new Date().toISOString(),
            sinkTag: randomSinkTag(),
          },
        }),
      });
      const data = await response.json();
      console.log("Created feed (http):", data);
    } catch (error) {
      console.error("Error creating feed:", error);
    }
  };

  const deleteFeed = (feedId: string) => {
    deleteFeedFn(feedId);
    if (expandedFeed === feedId) {
      setExpandedFeed(null);
    }
  };

  const deleteFeedHttp = async (feedId: string) => {
    try {
      const response = await fetch(
        `/api/feeds/${feedId}?roomId=${encodeURIComponent(ROOM_ID)}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        console.log("Deleted feed (http):", feedId);
        if (expandedFeed === feedId) {
          setExpandedFeed(null);
        }
      }
    } catch (error) {
      console.error("Error deleting feed:", error);
    }
  };

  const updateFeedMetadata = (feedId: string) => {
    updateFeedMetadataFn(feedId, { updated: new Date().toISOString() });
  };

  const updateFeedMetadataHttp = async (feedId: string) => {
    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: ROOM_ID,
          metadata: { updated: new Date().toISOString() },
        }),
      });
      const data = await response.json();
      console.log("Updated feed (http):", data);
    } catch (error) {
      console.error("Error updating feed:", error);
    }
  };

  const toggleMessages = (feedId: string) => {
    setExpandedFeed(expandedFeed === feedId ? null : feedId);
  };

  const createMessage = (feedId: string) => {
    const text = newMessageText[feedId]?.trim();
    if (!text) return;

    createFeedMessageFn(feedId, { content: text, role: "user" });
    setNewMessageText((prev) => ({ ...prev, [feedId]: "" }));
  };

  const createMessageHttp = async (feedId: string) => {
    const text = newMessageText[feedId]?.trim();
    if (!text) return;

    try {
      const response = await fetch(`/api/feeds/${feedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: ROOM_ID,
          data: { content: text, role: "user" },
        }),
      });
      const data = await response.json();
      console.log("Created message (http):", data);
      setNewMessageText((prev) => ({ ...prev, [feedId]: "" }));
    } catch (error) {
      console.error("Error creating message:", error);
    }
  };

  const updateMessage = (feedId: string, messageId: string) => {
    updateFeedMessageFn(feedId, messageId, {
      content: `(updated via ws at ${new Date().toISOString()})`,
      role: "user",
    });
  };

  const updateMessageHttp = async (feedId: string, messageId: string) => {
    try {
      const response = await fetch(
        `/api/feeds/${feedId}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: ROOM_ID,
            data: {
              content: `(updated via http at ${new Date().toISOString()})`,
              role: "user",
            },
          }),
        }
      );
      if (response.ok) {
        console.log("Updated message (http):", messageId);
      }
    } catch (error) {
      console.error("Error updating message:", error);
    }
  };

  const deleteMessage = (feedId: string, messageId: string) => {
    deleteFeedMessageFn(feedId, messageId);
  };

  const deleteMessageHttp = async (feedId: string, messageId: string) => {
    try {
      const response = await fetch(
        `/api/feeds/${feedId}/messages/${messageId}?roomId=${encodeURIComponent(ROOM_ID)}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        console.log("Deleted message (http):", messageId);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  if (error) {
    const detail =
      error instanceof LiveblocksError &&
        error.context.type === "FEED_REQUEST_ERROR"
        ? ` (${error.context.code})`
        : "";
    return (
      <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          <h1 className="text-xl font-bold mb-2">Could not load feeds{detail}</h1>
          <p className="text-sm whitespace-pre-wrap">{error.message}</p>
          <p className="mt-4 text-xs text-red-700">
            Feeds require a room on storage engine v2. Create or use a v2 room,
            or check the server error above.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Feeds</h1>
        {!isLoading && (
          <div className="flex gap-2">
            <button
              onClick={createFeed}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Feed
            </button>
            <button
              onClick={createFeedHttp}
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
            >
              Create Feed (http)
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
        <span className="font-medium text-gray-700">Filter by sinkTag:</span>
        {(["all", "alpha", "beta"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSinkFilter(key)}
            className={`rounded px-3 py-1 capitalize ${
              sinkFilter === key
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 p-3 text-sm">
        <span className="text-gray-600">
          Page size: {FEEDS_PAGE_LIMIT} · hasFetchedAll:{" "}
          {String(hasFetchedAll ?? false)} · isFetchingMore:{" "}
          {String(isFetchingMore ?? false)}
        </span>
        {fetchMoreError ? (
          <span className="text-red-600">fetchMore: {fetchMoreError.message}</span>
        ) : null}
        <button
          type="button"
          disabled={
            isLoading ||
            isFetchingMore ||
            hasFetchedAll ||
            fetchMore === undefined
          }
          onClick={() => void fetchMore?.()}
          className="rounded bg-indigo-100 px-3 py-1 font-medium text-indigo-900 hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load more feeds
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {feeds?.length === 0 && (
          <p className="text-gray-500">No feeds yet. Create one to get started!</p>
        )}

        {feeds?.map((feed) => {
          const isExpanded = expandedFeed === feed.feedId;

          return (
            <div
              key={feed.feedId}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    Feed: {feed.feedId.slice(0, 20)}...
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(feed.timestamp).toLocaleString()}
                  </p>
                  {feed.metadata && Object.keys(feed.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">Metadata:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(feed.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleMessages(feed.feedId)}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {isExpanded ? "Hide" : "Show"} Messages
                  </button>
                  <button
                    onClick={() => updateFeedMetadata(feed.feedId)}
                    className="px-3 py-1 text-sm bg-yellow-100 rounded hover:bg-yellow-200"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => updateFeedMetadataHttp(feed.feedId)}
                    className="px-3 py-1 text-sm bg-yellow-200 rounded hover:bg-yellow-300"
                  >
                    Update (http)
                  </button>
                  <button
                    onClick={() => deleteFeed(feed.feedId)}
                    className="px-3 py-1 text-sm bg-red-100 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => deleteFeedHttp(feed.feedId)}
                    className="px-3 py-1 text-sm bg-red-200 rounded hover:bg-red-300"
                  >
                    Delete (http)
                  </button>
                </div>
              </div>

              {isExpanded && (
                <FeedMessages
                  feedId={feed.feedId}
                  newMessageText={newMessageText[feed.feedId] || ""}
                  onMessageTextChange={(text) =>
                    setNewMessageText((prev) => ({
                      ...prev,
                      [feed.feedId]: text,
                    }))
                  }
                  onCreateMessage={() => createMessage(feed.feedId)}
                  onCreateMessageHttp={() => createMessageHttp(feed.feedId)}
                  onUpdateMessage={(messageId) =>
                    updateMessage(feed.feedId, messageId)
                  }
                  onUpdateMessageHttp={(messageId) =>
                    updateMessageHttp(feed.feedId, messageId)
                  }
                  onDeleteMessage={(messageId) =>
                    deleteMessage(feed.feedId, messageId)
                  }
                  onDeleteMessageHttp={(messageId) =>
                    deleteMessageHttp(feed.feedId, messageId)
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
