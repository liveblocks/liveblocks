"use client";

import { useDeleteFeed, useFeeds } from "@liveblocks/react/suspense";
import clsx from "clsx";
import { GitPullRequestIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { getRepoName } from "@/lib/repo";
import type { ChatFeed } from "@/lib/types";

type Group = { label: string; feeds: ChatFeed[] };

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

export function ChatList() {
  const { feeds } = useFeeds({ metadata: { type: "chat" } });
  const params = useParams<{ id?: string }>();
  const activeId = params?.id ?? null;

  const groups = useMemo(() => {
    const sorted = [...feeds].sort((a, b) => b.updatedAt - a.updatedAt);
    return groupByDay(sorted);
  }, [feeds]);

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
  const deleteFeed = useDeleteFeed();
  const router = useRouter();
  const { title, agentStatus, prUrl, repoUrl } = feed.metadata;
  const running = agentStatus === "running";

  const handleDelete = async () => {
    deleteFeed(feed.feedId);
    if (active) {
      router.push("/");
    }
  };

  return (
    <li className="group relative">
      <Link
        href={`/chat/${feed.feedId}`}
        className={clsx(
          "flex flex-col gap-0.5 rounded-md px-2 py-1.5 pr-8 transition",
          active ? "bg-panel-active" : "hover:bg-panel-hover"
        )}
      >
        <span className="flex items-center gap-1.5">
          {running ? (
            <Loader2Icon
              className="size-3 shrink-0 animate-spin text-accent"
              aria-label="Working"
            />
          ) : (
            <span
              className={clsx(
                "size-1.5 shrink-0 rounded-full",
                prUrl ? "bg-success" : "bg-subtle/60"
              )}
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            {title || "New chat"}
          </span>
        </span>
        <span className="flex items-center gap-1.5 pl-3 text-[11px] text-subtle">
          <span className="truncate">{getRepoName(repoUrl)}</span>
          {prUrl ? (
            <GitPullRequestIcon
              className="size-3 shrink-0 text-success"
              aria-label="Pull request opened"
            />
          ) : null}
          <span className="ml-auto shrink-0">
            {formatRelative(feed.updatedAt)}
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void handleDelete()}
        aria-label="Delete chat"
        title="Delete chat"
        className="absolute right-1.5 top-1.5 rounded p-1 text-subtle opacity-0 transition hover:bg-panel-active hover:text-danger group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2Icon className="size-3.5" />
      </button>
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
