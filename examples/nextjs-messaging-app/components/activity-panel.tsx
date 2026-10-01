"use client";

import { useFeedMessages } from "@liveblocks/react";
import { useFeeds, useSelf, useStorage } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { CheckCheckIcon, CheckIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUser } from "@/app/database";
import { ColumnHeader } from "@/components/column-header";
import {
  MessagePreview,
  PreviewRow,
  PreviewSkeleton,
  UnreadDot,
} from "@/components/preview-row";
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
    <PreviewRow
      active={active}
      unread={unread}
      user={from}
      title={
        <span className="min-w-0 truncate">
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
      }
      time={item.createdAt}
      indicator={<UnreadDot />}
      actions={
        unread ? (
          <button
            type="button"
            onClick={onMarkRead}
            className="flex size-5 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-200/70 hover:text-neutral-700"
            aria-label="Mark as read"
            title="Mark as read"
          >
            <CheckIcon className="size-4" />
          </button>
        ) : undefined
      }
      onOpen={onOpen}
    >
      {message ? (
        <MessagePreview message={message} />
      ) : error ? (
        <span className="text-neutral-500">Message unavailable</span>
      ) : exhausted ? (
        <span className="text-neutral-500">
          Message is further back in the history
        </span>
      ) : (
        <PreviewSkeleton />
      )}
    </PreviewRow>
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
