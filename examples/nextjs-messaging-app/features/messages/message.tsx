"use client";

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
import { getUser } from "@/lib/database";
import type { ChatMessage, ChatMessageData, ThreadFeed } from "@/lib/feeds";
import { formatTime } from "@/lib/time";
import { Markdown } from "@/primitives/markdown";
import { EmojiPickerPopover } from "./emoji-picker-popover";

export type MessageReaction = NonNullable<ChatMessageData["reactions"]>[number];

export function Message({
  message,
  feedId,
  showHeader,
  threadFeed,
  onOpenThread,
  variant = "channel",
  highlighted = false,
  onDelete,
}: {
  message: ChatMessage;
  feedId: string;
  showHeader: boolean;
  threadFeed?: ThreadFeed;
  onOpenThread?: () => void;
  variant?: "channel" | "thread";
  highlighted?: boolean;
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
      } catch {}
    }
  };

  return (
    <div
      data-message-id={message.id}
      className={clsx(
        "group relative flex items-start gap-3 px-5 py-0.5 transition-colors",
        highlighted
          ? "bg-yellow-50 hover:bg-yellow-100/60"
          : "hover:bg-neutral-50"
      )}
    >
      <div className="w-9 shrink-0">
        {showHeader ? (
          <span className="mt-0.5 block size-9 min-h-9 min-w-9 overflow-hidden rounded-md bg-neutral-200">
            <img
              src={user?.info.avatar}
              alt={user?.info.name ?? "User"}
              className="size-full object-cover"
            />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        {showHeader ? (
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
        ) : null}
        <MessageBody message={message} />

        {!message.data.streaming && reactionGroups.length > 0 ? (
          <ReactionChips groups={reactionGroups} onToggle={toggleReaction} />
        ) : null}

        {variant === "channel" &&
        threadFeed &&
        replyCount > 0 &&
        onOpenThread ? (
          <ThreadPill
            threadFeed={threadFeed}
            replyCount={replyCount}
            onOpenThread={onOpenThread}
          />
        ) : null}
      </div>

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
                className="icon-grow p-1 text-neutral-500 transition-colors hover:text-brand-600"
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
              className="icon-grow p-1 text-neutral-500 transition-colors hover:text-brand-600"
              aria-label="Reply in thread"
            >
              <MessageSquareText className="size-4" />
            </button>
          ) : null}
          {showDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="icon-grow p-1 text-neutral-500 transition-colors hover:text-red-600"
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
  onToggle,
}: {
  groups: ReactionGroup[];
  onToggle: (emoji: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
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
            "cursor-pointer rounded-full border px-1.75 text-normal gap-1 flex items-center h-6.5 transition-colors",
            group.selfReacted
              ? "border-brand-500/60 bg-brand-50 text-brand-700 font-medium"
              : "border-transparent bg-neutral-200/50 hover:border-neutral-200 hover:bg-white text-neutral-700"
          )}
        >
          <span>{group.emoji}</span>{" "}
          <span className="text-xs tabular-nums">{group.reactions.length}</span>
        </button>
      ))}
      <EmojiPickerPopover onSelect={onToggle}>
        <button
          type="button"
          className="icon-grow rounded-full border px-1.75 text-normal gap-1 flex items-center h-6.5 border-transparent bg-neutral-200/50 transition-colors hover:border-neutral-200 hover:bg-white text-neutral-700"
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
  onOpenThread,
}: {
  threadFeed: ThreadFeed;
  replyCount: number;
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
      className="cursor-pointer -ml-0.75 flex w-fit items-center gap-2 rounded-md border border-transparent pl-0.75 pr-1.5 py-0.75 text-xs transition hover:border-neutral-200 hover:bg-white"
    >
      {participants.length > 0 ? (
        <span className="flex items-center gap-0.5">
          {participants.map((participant) => (
            <span
              key={participant.id}
              title={participant.info.name}
              className="inline-block size-6.5 min-h-6.5 min-w-6.5 shrink-0 overflow-hidden rounded border border-white bg-neutral-200"
            >
              <img
                src={participant.info.avatar}
                alt={participant.info.name}
                className="size-full object-cover"
              />
            </span>
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

function MessageBody({ message }: { message: ChatMessage }) {
  const { content, streaming } = message.data;

  if (!content && streaming) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <LoaderCircle className="size-4 animate-spin" />
        <span>Thinking…</span>
      </div>
    );
  }

  return <Markdown content={content} />;
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
