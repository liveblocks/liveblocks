"use client";

import {
  useDeleteFeed,
  useFeeds,
  useUpdateFeedMetadata,
} from "@liveblocks/react/suspense";
import clsx from "clsx";
import {
  GitPullRequestIcon,
  Loader2Icon,
  PinIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useCanWrite } from "@/app/providers";
import { capitalizeFirst } from "@/lib/prompt";
import type { ChatFeed } from "@/lib/types";

type Group = { label: string; feeds: ChatFeed[] };

function isPinned(feed: ChatFeed) {
  return feed.metadata.pinned === "true";
}

function groupByDay(feeds: ChatFeed[]): Group[] {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const groups: Group[] = [
    { label: "Today", feeds: [] },
    { label: "Yesterday", feeds: [] },
    { label: "Previous 7 days", feeds: [] },
    { label: "Older", feeds: [] },
  ];

  for (const feed of feeds) {
    const date = new Date(feed.updatedAt);
    if (sameDay(date, today)) {
      groups[0].feeds.push(feed);
    } else if (sameDay(date, yesterday)) {
      groups[1].feeds.push(feed);
    } else if (date >= weekAgo) {
      groups[2].feeds.push(feed);
    } else {
      groups[3].feeds.push(feed);
    }
  }

  return groups.filter((group) => group.feeds.length > 0);
}

function groupFeeds(feeds: ChatFeed[]): Group[] {
  const sorted = [...feeds].sort((a, b) => b.updatedAt - a.updatedAt);
  const pinned = sorted.filter(isPinned);
  const unpinned = sorted.filter((feed) => !isPinned(feed));
  const groups: Group[] = [];
  if (pinned.length > 0) {
    groups.push({ label: "Pinned", feeds: pinned });
  }
  groups.push(...groupByDay(unpinned));
  return groups;
}

export function ChatList() {
  const { feeds } = useFeeds({ metadata: { type: "chat" } });
  const params = useParams<{ id?: string }>();
  const activeId = params?.id ?? null;

  const groups = useMemo(() => groupFeeds(feeds), [feeds]);

  if (feeds.length === 0) {
    return (
      <p className="px-2 pt-6 text-center text-xs text-subtle">
        No chats yet. Start one to put the agent to work.
      </p>
    );
  }

  return (
    <nav className="flex flex-col gap-3 pt-1">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-2 pb-1 text-[11px] font-medium text-subtle">
            {group.label}
          </div>
          <ul className="flex flex-col gap-px">
            {group.feeds.map((feed) => (
              <ChatListItem
                key={feed.feedId}
                feed={feed}
                active={feed.feedId === activeId}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ChatListItem({ feed, active }: { feed: ChatFeed; active: boolean }) {
  const canWrite = useCanWrite();
  const deleteFeed = useDeleteFeed();
  const updateFeedMetadata = useUpdateFeedMetadata();
  const router = useRouter();
  const { title, agentStatus, prUrl } = feed.metadata;
  const running = agentStatus === "running";
  const pinned = isPinned(feed);

  const handlePin = () => {
    updateFeedMetadata(feed.feedId, {
      ...feed.metadata,
      pinned: pinned ? "false" : "true",
    });
  };

  const handleDelete = async () => {
    deleteFeed(feed.feedId);
    if (active) {
      router.push("/");
    }
  };

  return (
    <li
      className={clsx(
        "group relative rounded-md transition-colors duration-150 ease-out",
        active
          ? "bg-panel-active"
          : "hover:bg-panel-hover focus-within:bg-panel-hover"
      )}
    >
      <Link
        href={`/chat/${feed.feedId}`}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5"
      >
        <div className="flex w-3 shrink-0 items-center justify-center">
          {running ? (
            <Loader2Icon
              className="size-3 shrink-0 animate-spin text-accent"
              aria-label="Working"
            />
          ) : prUrl ? (
            <GitPullRequestIcon
              className="size-3 shrink-0 text-success"
              aria-label="Pull request opened"
            />
          ) : null}
        </div>
        <span
          className={clsx(
            "min-w-0 flex-1 truncate text-[13px] font-normal text-muted hover:text-foreground",
            active && "text-foreground!"
          )}
        >
          {capitalizeFirst(title || "New chat")}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-subtle">
          {formatRelative(feed.updatedAt)}
        </span>
      </Link>
      {canWrite ? (
        <div
          className={clsx(
            "pointer-events-none absolute inset-y-0 right-0 flex items-stretch opacity-0 transition-opacity duration-150 ease-out",
            "group-hover:pointer-events-auto group-hover:opacity-100",
            "focus-within:pointer-events-auto focus-within:opacity-100"
          )}
        >
          <div
            className={clsx(
              "w-6 bg-linear-to-l",
              active
                ? "from-panel-active to-panel-active/0"
                : "from-panel-hover to-panel-hover/0"
            )}
            aria-hidden
          />
          <div
            className={clsx(
              "flex items-center pr-1.5",
              active ? "bg-panel-active" : "bg-panel-hover"
            )}
          >
            <button
              type="button"
              onClick={handlePin}
              aria-label={pinned ? "Unpin chat" : "Pin chat"}
              title={pinned ? "Unpin chat" : "Pin chat"}
              className={clsx(
                "flex h-full items-center justify-center rounded p-1 transition-[color,transform] duration-150 ease-out active:scale-[0.96] text-subtle hover:text-foreground"
              )}
            >
              <PinIcon className={clsx("size-3.5", pinned && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              aria-label="Delete chat"
              title="Delete chat"
              className="flex h-full items-center justify-center rounded p-1 text-subtle transition-[color,transform] duration-150 ease-out hover:text-danger active:scale-[0.96]"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function formatRelative(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}
