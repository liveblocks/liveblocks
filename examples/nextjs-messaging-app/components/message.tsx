"use client";

import { getUser } from "@/app/database";
import { EmojiPickerPopover } from "@/components/emoji-picker-popover";
import { Markdown } from "@/lib/markdown";
import type { ThreadFeed } from "@/lib/threads";
import {
  useDeleteFeed,
  useDeleteFeedMessage,
  useSelf,
  useUpdateFeedMessage,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  LoaderCircle,
  MessageSquareText,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

export type MessageReaction = {
  emoji: string;
  userId: string;
  createdAt: number;
};

export type FeedMessage = {
  id: string;
  createdAt: number;
  data: {
    userId: string;
    content: string;
    streaming?: boolean;
    reactions?: MessageReaction[];
  };
};

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function Message({
  message,
  feedId,
  showHeader,
  threadFeed,
  onOpenThread,
  variant = "channel",
  onDelete,
}: {
  message: FeedMessage;
  feedId: string;
  showHeader: boolean;
  threadFeed?: ThreadFeed;
  onOpenThread?: () => void;
  variant?: "channel" | "thread";
  onDelete?: () => void | Promise<void>;
}) {
  const self = useSelf();
  const deleteFeed = useDeleteFeed();
  const deleteFeedMessage = useDeleteFeedMessage();
  const updateFeedMessage = useUpdateFeedMessage();
  const [pickerOpen, setPickerOpen] = useState(false);
  const user = getUser(message.data.userId);
  const isOwn = self.id === message.data.userId;
  const showDelete = isOwn && (variant === "channel" || onDelete !== undefined);
  const replyCount = Number.parseInt(
    threadFeed?.metadata.replyCount ?? "0",
    10
  );
  const reactionGroups = groupReactions(message.data.reactions ?? [], self.id);

  const toggleReaction = async (emoji: string) => {
    const reactions = message.data.reactions ?? [];
    const hasReacted = reactions.some(
      (reaction) => reaction.emoji === emoji && reaction.userId === self.id
    );
    const nextReactions = hasReacted
      ? reactions.filter(
          (reaction) => reaction.emoji !== emoji || reaction.userId !== self.id
        )
      : [
          ...reactions,
          {
            emoji,
            userId: self.id,
            createdAt: Date.now(),
          },
        ];

    await updateFeedMessage(feedId, message.id, {
      ...message.data,
      reactions: nextReactions,
    });
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      return;
    }

    await deleteFeedMessage(feedId, message.id);
    if (threadFeed) {
      try {
        await deleteFeed(threadFeed.feedId);
      } catch {
        // The thread feed may already have been deleted.
      }
    }
  };

  return (
    <div
      className={clsx(
        "group relative px-5 py-0.5 hover:bg-neutral-50",
        !showHeader && "pl-[68px]"
      )}
    >
      {showHeader ? (
        <div className="flex items-start gap-3">
          <img
            src={user?.info.avatar}
            alt={user?.info.name ?? "User"}
            className="mt-0.5 size-9 shrink-0 rounded-md bg-neutral-200 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-neutral-900">
                {user?.info.name ?? "Unknown user"}
              </span>
              <time
                className="text-xs text-neutral-500"
                dateTime={new Date(message.createdAt).toISOString()}
              >
                {formatTime(message.createdAt)}
              </time>
            </div>
            <MessageBody message={message} />
          </div>
        </div>
      ) : (
        <MessageBody message={message} />
      )}

      {!message.data.streaming && reactionGroups.length > 0 ? (
        <ReactionChips
          groups={reactionGroups}
          indented={showHeader}
          onToggle={toggleReaction}
        />
      ) : null}

      {variant === "channel" && threadFeed && replyCount > 0 && onOpenThread ? (
        <ThreadPill
          threadFeed={threadFeed}
          replyCount={replyCount}
          indented={showHeader}
          onOpenThread={onOpenThread}
        />
      ) : null}

      {!message.data.streaming ||
      (variant === "channel" && onOpenThread) ||
      showDelete ? (
        <div
          className={clsx(
            "p-0.5 absolute right-3 top-1 flex items-center gap-0.5 rounded-md border border-neutral-200 bg-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100",
            pickerOpen && "opacity-100"
          )}
        >
          {!message.data.streaming ? (
            <EmojiPickerPopover
              onSelect={toggleReaction}
              onOpenChange={setPickerOpen}
            >
              <button
                type="button"
                className="p-1 text-neutral-500 hover:text-brand-600"
                aria-label="Add reaction"
              >
                <SmilePlus className="size-4" />
              </button>
            </EmojiPickerPopover>
          ) : null}
          {variant === "channel" && onOpenThread ? (
            <button
              type="button"
              onClick={onOpenThread}
              className="p-1 text-neutral-500 hover:text-brand-600"
              aria-label="Reply in thread"
            >
              <MessageSquareText className="size-4" />
            </button>
          ) : null}
          {showDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="p-1 text-neutral-500 hover:text-red-600"
              aria-label="Delete message"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type ReactionGroup = {
  emoji: string;
  reactions: MessageReaction[];
  selfReacted: boolean;
};

function groupReactions(
  reactions: MessageReaction[],
  selfId: string
): ReactionGroup[] {
  const groups: ReactionGroup[] = [];
  const groupsByEmoji = new Map<string, ReactionGroup>();

  for (const reaction of reactions) {
    const existing = groupsByEmoji.get(reaction.emoji);
    if (existing) {
      existing.reactions.push(reaction);
      if (reaction.userId === selfId) {
        existing.selfReacted = true;
      }
      continue;
    }

    const group = {
      emoji: reaction.emoji,
      reactions: [reaction],
      selfReacted: reaction.userId === selfId,
    };
    groupsByEmoji.set(reaction.emoji, group);
    groups.push(group);
  }

  return groups;
}

function ReactionChips({
  groups,
  indented,
  onToggle,
}: {
  groups: ReactionGroup[];
  indented: boolean;
  onToggle: (emoji: string) => void;
}) {
  return (
    <div
      className={clsx(
        "mt-1 flex flex-wrap items-center gap-1",
        indented && "ml-12"
      )}
    >
      {groups.map((group) => (
        <button
          key={group.emoji}
          type="button"
          onClick={() => onToggle(group.emoji)}
          title={group.reactions
            .map((reaction) => {
              const name =
                getUser(reaction.userId)?.info.name ?? reaction.userId;
              return `${name} (${formatTime(reaction.createdAt)})`;
            })
            .join(", ")}
          className={clsx(
            "rounded-full border px-1.75 text-normal gap-1 flex items-center h-6.5",
            group.selfReacted
              ? "border-brand-500/60 bg-brand-50 text-brand-700 font-medium"
              : "border-transparent bg-neutral-200/50 hover:border-neutral-200 hover:bg-white text-neutral-700"
          )}
        >
          {group.emoji}{" "}
          <span className="text-xs tabular-nums">{group.reactions.length}</span>
        </button>
      ))}
      <EmojiPickerPopover onSelect={onToggle}>
        <button
          type="button"
          className="rounded-full border px-1.75 text-normal gap-1 flex items-center h-6.5 border-transparent bg-neutral-200/50 hover:border-neutral-200 hover:bg-white text-neutral-700"
          aria-label="Add reaction"
        >
          <SmilePlus className="size-4" />
        </button>
      </EmojiPickerPopover>
    </div>
  );
}

function ThreadPill({
  threadFeed,
  replyCount,
  indented,
  onOpenThread,
}: {
  threadFeed: ThreadFeed;
  replyCount: number;
  indented: boolean;
  onOpenThread: () => void;
}) {
  const participants = (threadFeed.metadata.participantIds ?? [])
    .map((userId) => getUser(userId))
    .filter((user) => user !== undefined)
    .slice(0, 5);

  return (
    <button
      type="button"
      onClick={onOpenThread}
      className={clsx(
        "cursor-pointer flex w-fit items-center gap-2 rounded-md border border-transparent pl-0.75 pr-1.5 py-0.75 text-xs transition hover:border-neutral-200 hover:bg-white",
        indented && "ml-10.5"
      )}
    >
      {participants.length > 0 ? (
        <span className="flex items-center gap-0.5">
          {participants.map((participant) => (
            <img
              key={participant.id}
              src={participant.info.avatar}
              alt={participant.info.name}
              title={participant.info.name}
              className={clsx(
                "size-6.5 rounded border border-white bg-neutral-200 object-cover"
              )}
            />
          ))}
        </span>
      ) : null}
      <span className="font-semibold text-brand-600">
        {replyCount} {replyCount === 1 ? "reply" : "replies"}
      </span>
      <span className="text-neutral-500">
        Last reply at {formatTime(threadFeed.updatedAt)}
      </span>
    </button>
  );
}

function MessageBody({ message }: { message: FeedMessage }) {
  const { content, streaming } = message.data;

  if (!content && streaming) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <LoaderCircle className="size-4 animate-spin" />
        <span>Thinking…</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Markdown content={content} />
      {streaming ? (
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
          <span className="size-1.5 animate-pulse rounded-full bg-brand-400" />
          Streaming
        </span>
      ) : null}
    </div>
  );
}

export function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative px-5 py-4">
      <div className="absolute inset-x-4 top-1/2 border-t border-neutral-200" />
      <div className="relative mx-auto w-fit rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
        {label}
      </div>
    </div>
  );
}

export function formatDayLabel(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) {
    return "Today";
  }
  if (sameDay(date, yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type MessageListItem =
  | { type: "divider"; label: string; key: string }
  | {
      type: "message";
      message: FeedMessage;
      showHeader: boolean;
      key: string;
    };

export function buildMessageListItems(
  messages: FeedMessage[],
  options: { dayDividers?: boolean } = {}
): MessageListItem[] {
  const { dayDividers = true } = options;
  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);
  const items: MessageListItem[] = [];
  let lastDay: string | null = null;
  let previous: FeedMessage | null = null;

  for (const message of sorted) {
    const dayLabel = formatDayLabel(message.createdAt);
    if (dayDividers && dayLabel !== lastDay) {
      items.push({
        type: "divider",
        label: dayLabel,
        key: `divider-${dayLabel}-${message.createdAt}`,
      });
      lastDay = dayLabel;
      previous = null;
    }

    const showHeader =
      !previous ||
      previous.data.userId !== message.data.userId ||
      message.createdAt - previous.createdAt > GROUP_WINDOW_MS;

    items.push({
      type: "message",
      message,
      showHeader,
      key: message.id,
    });
    previous = message;
  }

  return items;
}
