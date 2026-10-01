"use client";

import { useFeedMessages } from "@liveblocks/react";
import { useFeeds, useSelf, useStorage } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { CheckCheckIcon, CheckIcon, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUser } from "@/app/database";
import { formatTime } from "@/components/message";
import { ColumnHeader } from "@/components/column-header";
import {
  getActivityRootFeedId,
  isChatMessage,
  isUnread,
  type ActivityItem,
} from "@/lib/activity";
import {
  isDmFeedId,
  type MessageHighlight,
  type Selection,
} from "@/lib/conversations";
import { Markdown } from "@/lib/markdown";
import {
  useActivity,
  useDismissActivity,
  useMarkActivityRead,
} from "@/lib/use-activity";

// How many extra pages of a feed to load while looking for the message an
// item points at, before giving up and just linking to the conversation.
const MAX_EXTRA_PAGES = 4;

export type ActivityTarget = {
  itemId: string;
  selection: Selection;
  threadMessageId: string | null;
  highlight: MessageHighlight;
};

export function ActivityPanel({
  activeItemId,
  onNavigate,
}: {
  activeItemId: string | null;
  onNavigate: (target: ActivityTarget) => void;
}) {
  const selfId = useSelf((me) => me.id);
  const { items, unreadItems, hasFetchedAll, fetchMore, isFetchingMore } =
    useActivity();
  const markActivityRead = useMarkActivityRead();
  const dismissActivity = useDismissActivity();
  const channels = useStorage((root) => root.channels);
  const { feeds: dmFeeds } = useFeeds({ metadata: { type: "dm" } });

  // Where an item takes you when clicked. DM feed ids aren't reversible, so
  // the other participant comes from the DM feed's metadata.
  const resolveTarget = useCallback(
    (item: ActivityItem): ActivityTarget => {
      const rootFeedId = getActivityRootFeedId(item);
      const threadMessageId = item.data.parentMessageId ?? null;
      const highlight = {
        feedId: item.data.feedId,
        messageId: item.data.messageId,
      };

      if (isDmFeedId(rootFeedId)) {
        const dmFeed = dmFeeds.find((feed) => feed.feedId === rootFeedId);
        const userId =
          dmFeed?.metadata.participantIds?.find((id) => id !== selfId) ??
          item.data.fromUserId;
        return {
          itemId: item.id,
          selection: { type: "dm", userId },
          threadMessageId,
          highlight,
        };
      }

      return {
        itemId: item.id,
        selection: { type: "channel", channelId: rootFeedId },
        threadMessageId,
        highlight,
      };
    },
    [dmFeeds, selfId]
  );

  const describeLocation = useCallback(
    (item: ActivityItem) => {
      const rootFeedId = getActivityRootFeedId(item);
      if (isDmFeedId(rootFeedId)) {
        return "your conversation";
      }
      const channel = channels.find((channel) => channel.id === rootFeedId);
      return channel ? `#${channel.name}` : "a deleted channel";
    },
    [channels]
  );

  return (
    <>
      <ColumnHeader title="Activity">
        {unreadItems.length > 0 ? (
          <button
            type="button"
            onClick={() => void markActivityRead(unreadItems)}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Mark all as read"
            title="Mark all as read"
          >
            <CheckCheckIcon className="size-4" aria-hidden />
          </button>
        ) : null}
      </ColumnHeader>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-5 text-center">
          <p className="text-sm font-medium text-neutral-700">
            Nothing here yet
          </p>
          <p className="text-sm text-neutral-500">
            Direct messages, @mentions, and replies in your threads show up
            here.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          <ul>
            {items.map((item) => (
              <ActivityRow
                key={item.id}
                item={item}
                active={item.id === activeItemId}
                location={describeLocation(item)}
                onOpen={() => onNavigate(resolveTarget(item))}
                onMarkRead={() => void markActivityRead([item])}
                onDismiss={() => void dismissActivity(item)}
              />
            ))}
          </ul>
          {!hasFetchedAll ? (
            <div className="flex justify-center py-3">
              <button
                type="button"
                onClick={fetchMore}
                disabled={isFetchingMore}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
              >
                {isFetchingMore ? "Loading…" : "Load older activity"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

function ActivityRow({
  item,
  active,
  location,
  onOpen,
  onMarkRead,
  onDismiss,
}: {
  item: ActivityItem;
  active: boolean;
  location: string;
  onOpen: () => void;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const from = getUser(item.data.fromUserId);
  const unread = isUnread(item);
  const { feedId, messageId } = item.data;
  // Items only reference the message; load it from its own feed so the
  // content stays live (reactions, AI replies streaming in, deletions).
  const { messages, isLoading, error, hasFetchedAll, fetchMore, isFetchingMore } =
    useFeedMessages(feedId);
  const [extraPages, setExtraPages] = useState(0);

  const message = useMemo(() => {
    const found = messages?.find((message) => message.id === messageId);
    return found && isChatMessage(found) ? found : undefined;
  }, [messageId, messages]);

  const exhausted = hasFetchedAll === true || extraPages >= MAX_EXTRA_PAGES;

  useEffect(() => {
    if (message || isLoading || error || isFetchingMore) {
      return;
    }

    if (!hasFetchedAll && extraPages < MAX_EXTRA_PAGES) {
      setExtraPages((pages) => pages + 1);
      fetchMore?.();
      return;
    }

    // The whole feed is loaded and the message isn't in it: it was deleted.
    if (hasFetchedAll) {
      onDismiss();
    }
  }, [
    error,
    extraPages,
    fetchMore,
    hasFetchedAll,
    isFetchingMore,
    isLoading,
    message,
    onDismiss,
  ]);

  return (
    <li
      className={clsx(
        "group relative",
        active
          ? "bg-neutral-100"
          : unread
            ? "bg-brand-50/60"
            : undefined
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={clsx(
          "flex w-full items-start gap-2.5 py-3 pl-3 pr-4 text-left transition",
          active
            ? "hover:bg-neutral-100"
            : unread
              ? "hover:bg-brand-50"
              : "hover:bg-neutral-50"
        )}
      >
        <span
          className={clsx(
            "mt-3.5 size-2 shrink-0 rounded-full",
            unread ? "bg-brand-500" : "bg-transparent"
          )}
          aria-hidden
        />
        <span
          className={clsx(
            "mt-0.5 block size-9 min-h-9 min-w-9 overflow-hidden rounded-md bg-neutral-200",
            !unread && "opacity-75"
          )}
        >
          <img
            src={from?.info.avatar}
            alt=""
            className="size-full object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2 pr-8">
            <span
              className={clsx(
                "min-w-0 truncate text-sm",
                unread ? "text-neutral-700" : "text-neutral-500"
              )}
            >
              <span
                className={clsx(
                  "font-semibold",
                  unread ? "text-neutral-900" : "text-neutral-700"
                )}
              >
                {from?.info.name ?? "Someone"}
              </span>{" "}
              {describeActivity(item, location)}
            </span>
            <time
              className="shrink-0 text-xs text-neutral-500"
              dateTime={new Date(item.createdAt).toISOString()}
            >
              {formatTime(item.createdAt)}
            </time>
          </span>
          <span
            className={clsx(
              "mt-0.5 block text-sm",
              unread ? "text-neutral-800" : "text-neutral-600"
            )}
          >
            {message ? (
              message.data.streaming && !message.data.content ? (
                <span className="flex items-center gap-2 text-neutral-500">
                  <LoaderCircle className="size-4 animate-spin" />
                  Thinking…
                </span>
              ) : (
                <span className="line-clamp-3">
                  <Markdown content={message.data.content} />
                </span>
              )
            ) : error ? (
              <span className="text-neutral-500">Message unavailable</span>
            ) : exhausted ? (
              <span className="text-neutral-500">
                Message is further back in the history
              </span>
            ) : (
              <span className="inline-block h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
            )}
          </span>
        </span>
      </button>
      {unread ? (
        <button
          type="button"
          onClick={onMarkRead}
          className="absolute right-4 top-3 rounded-md p-1 text-neutral-400 opacity-0 transition hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 focus:opacity-100"
          aria-label="Mark as read"
          title="Mark as read"
        >
          <CheckIcon className="size-4" />
        </button>
      ) : null}
    </li>
  );
}

function describeActivity(item: ActivityItem, location: string) {
  const inThread = item.data.parentMessageId !== undefined;

  switch (item.data.type) {
    case "dm":
      return "sent you a direct message";
    case "mention":
      return inThread
        ? `mentioned you in a thread in ${location}`
        : `mentioned you in ${location}`;
    case "thread_reply":
      return `replied in a thread in ${location}`;
  }
}
