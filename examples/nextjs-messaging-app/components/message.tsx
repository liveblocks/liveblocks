"use client";

import { getUser } from "@/app/database";
import { Markdown } from "@/lib/markdown";
import {
  useDeleteFeedMessage,
  useSelf,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import { LoaderCircle, Trash2 } from "lucide-react";

export type FeedMessage = {
  id: string;
  createdAt: number;
  data: {
    userId: string;
    content: string;
    streaming?: boolean;
  };
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function Message({
  message,
  feedId,
  showHeader,
}: {
  message: FeedMessage;
  feedId: string;
  showHeader: boolean;
}) {
  const self = useSelf();
  const deleteFeedMessage = useDeleteFeedMessage();
  const user = getUser(message.data.userId);
  const isOwn = self.id === message.data.userId;

  return (
    <div
      className={clsx(
        "group relative px-4 py-0.5 hover:bg-neutral-50",
        !showHeader && "pl-[4.25rem]"
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

      {isOwn ? (
        <button
          type="button"
          onClick={() => deleteFeedMessage(feedId, message.id)}
          className="absolute right-3 top-1 rounded-md border border-neutral-200 bg-white p-1 text-neutral-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-red-600"
          aria-label="Delete message"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
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
          <span className="size-1.5 animate-pulse rounded-full bg-indigo-400" />
          Streaming
        </span>
      ) : null}
    </div>
  );
}

export function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative px-4 py-4">
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
    year:
      date.getFullYear() === today.getFullYear() ? undefined : "numeric",
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

export function buildMessageListItems(messages: FeedMessage[]): MessageListItem[] {
  const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);
  const items: MessageListItem[] = [];
  let lastDay: string | null = null;
  let previous: FeedMessage | null = null;

  for (const message of sorted) {
    const dayLabel = formatDayLabel(message.createdAt);
    if (dayLabel !== lastDay) {
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
