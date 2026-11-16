"use client";

import { PlusIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { NewPostMenu } from "@/components/new-post-menu";
import { Button } from "@/components/ui/button";
import {
  compareByDateTime,
  formatDayHeading,
  getPeriodGrid,
  isSameDay,
  isSamePeriod,
  parseDateKey,
  toDateKey,
  WEEKDAYS,
  type DateKey,
  type Period,
} from "@/lib/dates";
import { PLATFORM_INFO, type Platform } from "@/lib/platforms";
import type { PostData } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { PostBoard, PostBoardDay } from "./post-board";
import { PostCard } from "./post-card";

type CalendarGridProps = {
  period: Period;
  /** Any day in the week or month to show. */
  date: Date;
  posts: PostData[];
  postHref: (postId: string) => string;
  onMovePost: (postId: string, date: DateKey) => void;
  onCreatePost: (date: DateKey, platform: Platform) => void;
};

/**
 * The week or month as a grid of days, each a drop target for the posts it
 * holds. A month shows whole weeks, so it starts and ends with a few days of
 * the neighboring months.
 */
export function CalendarGrid({
  period,
  date,
  posts,
  postHref,
  onMovePost,
  onCreatePost,
}: CalendarGridProps) {
  const days = useMemo(() => getPeriodGrid(period, date), [period, date]);
  const dayKeys = useMemo(() => days.map(toDateKey), [days]);

  const postsById = useMemo(
    () => new Map(posts.map((post) => [post.id, post])),
    [posts]
  );

  // The board's lists: every visible day's post ids, sorted by time. Days
  // without posts are present too, so they can receive a drop.
  const lists = useMemo(() => {
    const result: Record<DateKey, string[]> = Object.fromEntries(
      dayKeys.map((key) => [key, []])
    );
    for (const post of [...posts].sort(compareByDateTime)) {
      result[post.date]?.push(post.id);
    }
    return result;
  }, [dayKeys, posts]);

  const postLabel = useCallback(
    (postId: string) => {
      const post = postsById.get(postId);
      return post ? `${PLATFORM_INFO[post.platform].label} post` : undefined;
    },
    [postsById]
  );

  const dayLabel = useCallback(
    (day: string) => formatDayHeading(parseDateKey(day)),
    []
  );

  const today = new Date();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-neutral-950/5">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-3 py-2 text-xs font-medium text-neutral-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <PostBoard
          lists={lists}
          order={dayKeys}
          postLabel={postLabel}
          dayLabel={dayLabel}
          onListsChange={(_lists, details) => {
            // Only a change of day is stored; the order within a day follows
            // each post's time.
            if (details.from !== details.to) {
              onMovePost(details.key, details.to);
            }
          }}
          aria-label="Posts by day"
          className="grid h-full grid-cols-7"
          style={{
            // Every row gets an equal share of the height, whatever it holds;
            // a day with more posts than fit scrolls inside its cell.
            gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))`,
          }}
        >
          {days.map((day, index) => {
            const key = dayKeys[index];
            return (
              <DayCell
                key={key}
                date={day}
                dateKey={key}
                postsById={postsById}
                inPeriod={isSamePeriod(period, day, date)}
                isToday={isSameDay(day, today)}
                postHref={postHref}
                onCreatePost={onCreatePost}
              />
            );
          })}
        </PostBoard>
      </div>
    </div>
  );
}

function DayCell({
  date,
  dateKey,
  postsById,
  inPeriod,
  isToday,
  postHref,
  onCreatePost,
}: {
  date: Date;
  dateKey: DateKey;
  postsById: Map<string, PostData>;
  inPeriod: boolean;
  isToday: boolean;
  postHref: (postId: string) => string;
  onCreatePost: (date: DateKey, platform: Platform) => void;
}) {
  return (
    <PostBoardDay
      value={dateKey}
      role="group"
      aria-label={formatDayHeading(date)}
      className={cn(
        "group/day relative flex min-h-0 min-w-0 flex-col gap-1.5 border-r border-b border-neutral-950/5 p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
        !inPeriod && "bg-neutral-50/80",
        "data-over:bg-primary/5 data-over:ring-1 data-over:ring-primary/40 data-over:ring-inset"
      )}
    >
      {(state) => (
        <>
          <div className="flex items-center justify-between px-1">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                isToday
                  ? "bg-primary text-primary-foreground"
                  : inPeriod
                    ? "text-neutral-700"
                    : "text-neutral-400"
              )}
            >
              {date.getDate()}
            </span>
            <NewPostMenu
              align="start"
              label={`New post on ${date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}`}
              onSelect={(platform) => onCreatePost(dateKey, platform)}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-neutral-400 opacity-0 transition-opacity group-hover/day:opacity-100 focus-visible:opacity-100 data-open:opacity-100"
                  aria-label={`Add a post on ${formatDayHeading(date)}`}
                >
                  <PlusIcon />
                </Button>
              }
            />
          </div>

          {/* Rendered from the board's state, so a post being dragged shows up
          in the day it hovers before it's dropped. */}
          <div className="-m-0.5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto p-0.5">
            {state.posts.flatMap((id) => {
              const post = postsById.get(id);
              return post ? (
                <PostCard key={post.id} post={post} href={postHref(post.id)} />
              ) : (
                []
              );
            })}
          </div>
        </>
      )}
    </PostBoardDay>
  );
}
