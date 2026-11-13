"use client";

import { CalendarDaysIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { EditingAvatars } from "@/components/editing-avatars";
import { NewPostMenu } from "@/components/new-post-menu";
import { Button } from "@/components/ui/button";
import {
  compareByDateTime,
  formatDayHeading,
  formatMonthTitle,
  formatTime,
  isSameDay,
  parseDateKey,
  toDateKey,
  type DateKey,
} from "@/lib/dates";
import { PLATFORM_INFO, PlatformBadge, type Platform } from "@/lib/platforms";
import { STATUS_INFO, type PostData } from "@/lib/posts";
import { cn } from "@/lib/utils";

type ListViewProps = {
  month: Date;
  posts: PostData[];
  postHref: (postId: string) => string;
  onCreatePost: (date: DateKey, platform: Platform) => void;
};

export function ListView({
  month,
  posts,
  postHref,
  onCreatePost,
}: ListViewProps) {
  const groups = useMemo(() => {
    const byDay = new Map<DateKey, PostData[]>();
    for (const post of [...posts].sort(compareByDateTime)) {
      const list = byDay.get(post.date);
      if (list) {
        list.push(post);
      } else {
        byDay.set(post.date, [post]);
      }
    }
    return Array.from(byDay.entries());
  }, [posts]);

  const today = new Date();

  if (groups.length === 0) {
    const firstOfMonth = toDateKey(month);
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <CalendarDaysIcon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Nothing planned for {formatMonthTitle(month)}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Create a post to start filling the month.
          </p>
        </div>
        <NewPostMenu
          align="center"
          onSelect={(platform) => onCreatePost(firstOfMonth, platform)}
        >
          <Button size="sm">
            <PlusIcon />
            New post
          </Button>
        </NewPostMenu>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
        {groups.map(([dateKey, dayPosts]) => {
          const date = parseDateKey(dateKey);
          const isToday = isSameDay(date, today);
          return (
            <section key={dateKey} className="flex flex-col gap-2">
              <header className="flex items-center gap-2 px-1">
                <h2
                  className={cn(
                    "text-sm font-semibold",
                    isToday ? "text-primary" : "text-neutral-900"
                  )}
                >
                  {formatDayHeading(date)}
                </h2>
                {isToday ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Today
                  </span>
                ) : null}
                <span className="text-xs text-neutral-400">
                  {dayPosts.length} {dayPosts.length === 1 ? "post" : "posts"}
                </span>
                <NewPostMenu
                  align="start"
                  onSelect={(platform) => onCreatePost(dateKey, platform)}
                >
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto text-neutral-400"
                    aria-label="Add a post on this day"
                  >
                    <PlusIcon />
                  </Button>
                </NewPostMenu>
              </header>
              <ul className="divide-y divide-neutral-950/5 overflow-hidden rounded-lg bg-white ring-1 ring-neutral-950/5">
                {dayPosts.map((post) => (
                  <ListRow key={post.id} post={post} href={postHref(post.id)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ListRow({ post, href }: { post: PostData; href: string }) {
  const status = STATUS_INFO[post.status];
  const platform = PLATFORM_INFO[post.platform];

  return (
    <li>
      <Link
        href={href}
        className="group/row flex items-center gap-4 px-4 py-3 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
      >
        <span className="w-16 shrink-0 text-xs font-medium text-neutral-500 tabular-nums">
          {formatTime(post.time)}
        </span>
        <PlatformBadge platform={post.platform} size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-neutral-900">
            {post.preview || (
              <span className="text-neutral-400 italic">Empty post</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {platform.label} · {platform.handle}
          </p>
        </div>
        <EditingAvatars postId={post.id} size={22} />
        <span
          className={cn(
            "hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
            status.badge
          )}
        >
          {status.label}
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-neutral-300 transition-colors group-hover/row:text-neutral-500" />
      </Link>
    </li>
  );
}
